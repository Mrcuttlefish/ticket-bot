const unzipper = require('unzipper');
const { createInterface } = require('node:readline');
const pkg = require('../../../../../../package.json');
const { pools } = require('../../../../../lib/threads');
const {
	escapeHTML, checkTagRegex,
} = require('../../../../../lib/security');
const {
	sanitize,
	sanitizeCategory,
	schemas,
} = require('../../../../../lib/validation');

const MAX_SETTINGS_SIZE = 10 * 1024 * 1024; // 10 MiB

const { import: pool } = pools;

function parseJSON(string) {
	try {
		return JSON.parse(string);
	} catch {
		return null;
	}
}

// put would be better but forms can only get or post
module.exports.post = fastify => ({
	/**
	 *
	 * @param {import('fastify').FastifyRequest} req
	 * @param {import('fastify').FastifyReply} res
	 */
	handler: async (req, res) => {
		/** @type {import('client')} */
		const client = req.routeOptions.config.client;
		const id = req.params.guild;
		const guild = client.guilds.cache.get(id);
		const member = await guild.members.fetch(req.user.id);

		client.log.info(`${member.user.username} is importing data to "${guild.name}"`);

		client.keyv.delete(`cache/stats/guild:${id}`);

		const [zFile] = await req.saveRequestFiles({
			limits: {
				fields: 1,
				files: 1,
			},
		});

		res.raw.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

		const userLog = {
			error(string) {
				this.write('text-red-500 font-bold', 'text-red-700 dark:text-red-200', 'ERROR', string);
			},
			info(string) {
				this.write('text-cyan-500', 'text-cyan-700 dark:text-cyan-200', 'INFO', string);
			},
			success(string) {
				this.write('text-green-500', 'text-green-700 dark:text-green-200', 'SUCCESS', string);
			},
			warn(string) {
				this.write('text-orange-500', 'text-orange-700 dark:text-orange-200', 'WARN', string);
			},
			write(style1, style2, prefix, string) {
				res.raw.write(`<p><span class="${style1}">[${prefix}]</span> <span class="${style2}">${escapeHTML(string)}</span></p>`);
			},
		};

		try {
		// comment needs to be less than 512B
			const zip = await unzipper.Open.file(zFile.filepath, { tailSize: 512 });
			const { files } = zip;
			const comment = parseJSON(zip.comment);
			client.log.info('Import comment', comment);
			if (comment) {
				userLog.info(`v${comment.version} -> v${pkg.version}`);
			} else {
				userLog.warn('Comment is not parsable');
			}

			userLog.info('Reading settings.json');
			const settingsFile = files.find(f => f.path === 'settings.json');
			if (!settingsFile) throw new Error('settings.json is missing');
			if (settingsFile.uncompressedSize > MAX_SETTINGS_SIZE) throw new Error('settings.json is too large');
			if (!files.find(f => f.path === 'tickets.jsonl')) throw new Error('tickets.jsonl is missing');
			// `settingsJSON` is frozen, `settings` can be mutated
			const settingsJSON = JSON.parse(await settingsFile.buffer());
			Object.freeze(settingsJSON);
			if (!Array.isArray(settingsJSON.categories) || !Array.isArray(settingsJSON.tags)) throw new Error('settings.json is not a valid export');

			// validate everything before deleting the existing settings;
			// only known fields are copied so the file can't write to other guilds' data
			const settings = sanitize(settingsJSON, schemas.guildSettings);
			delete settings.webhookSecret; // never exported; it must be set again
			if (settings.webhookUrl) userLog.warn('The webhook secret (if there was one) must be set again');
			settings.tags = settingsJSON.tags.map(raw => {
				const tag = sanitize(raw, schemas.tag);
				if (tag.regex && !checkTagRegex(tag.regex).ok) {
					userLog.warn(`Removed the unsafe or invalid pattern from the "${tag.name}" tag`);
					tag.regex = null;
				}
				return tag;
			});
			const categories = settingsJSON.categories.map(raw => {
				const {
					data,
					questions,
				} = sanitizeCategory(raw);
				data.questions = questions ?? [];
				return data;
			});

			userLog.info('Importing general settings and tags');
			await client.prisma.$transaction([
				client.prisma.guild.delete({
					select: { id: true },
					where: { id },
				}),
				client.prisma.guild.create({
					data: {
						...settings,
						id,
						tags: { createMany: { data: settings.tags } },
					},
					// select ID so it doesn't return everything else
					select: { id: true },
				}),
			]);
			userLog.success(`Imported general settings and ${settings.tags.length} tags`);

			userLog.info('Importing categories');
			const newCategories = await client.prisma.$transaction(
				categories.map(category => client.prisma.category.create({
					data: {
						...category,
						guild: { connect: { id } },
						// question IDs are kept because answers reference them
						questions: { createMany: { data: category.questions } },
					},
					select: { id: true },
				})),
			);

			// settingsJSON.category because categories has been mutated (no id)
			const categoryMap = new Map(settingsJSON.categories.map((cat, idx) => ([cat.id, newCategories[idx].id])));

			for (const category of settingsJSON.categories) {
				userLog.info(`"${category.name}" ID ${category.id} -> ${categoryMap.get(category.id)}`);
			}

			userLog.success(`Imported ${categories.length} categories`);

			userLog.info('Reading tickets.jsonl');
			const stream = files.find(f => f.path === 'tickets.jsonl').stream();
			const lines = createInterface({
				crlfDelay: Infinity,
				input: stream,
			});
			const ticketsPromises = [];

			userLog.info('Encrypting tickets');

			for await (const line of lines) {
				// do not await in the loop
				ticketsPromises.push(pool.queue(worker => worker.importTicket(line, id, categoryMap)));
			}

			// TODO: batch 100 tickets per query?
			const ticketsResolved = await Promise.all(ticketsPromises);
			const importedIds = new Set(ticketsResolved.map(([ticket]) => ticket.id));
			for (const [ticket] of ticketsResolved) {
				// tickets can only reference other tickets from the same import
				if (ticket.referencesTicket && !importedIds.has(ticket.referencesTicket.connect.id)) delete ticket.referencesTicket;
			}
			const queries = [];
			const allMessages = [];

			for (const [ticket, ticketMessages] of ticketsResolved) {
				queries.push(
					client.prisma.ticket.create({
						data: ticket,
						select: { id: true },
					}),
				);
				allMessages.push(...ticketMessages);
			}

			if (allMessages.length > 0) {
				queries.push(client.prisma.archivedMessage.createMany({ data: allMessages }));
			}

			userLog.info('Importing tickets');
			await client.prisma.$transaction(queries);
			userLog.success(`Imported ${ticketsResolved.length} tickets`);
			userLog.success('(DONE) All data has been imported');

		} catch (error) {
			client.log.error(error);
			userLog.error(error);
		} finally {
			res.raw.end();
		}
	},
	onRequest: [fastify.authenticate, fastify.isAdmin],
});
