const { randomUUID } = require('node:crypto');
const unzipper = require('unzipper');
const { createInterface } = require('node:readline');
const { ChannelType } = require('discord.js');
const pkg = require('../../../../../../package.json');
const { pools } = require('../../../../../lib/threads');
const {
	escapeHTML, checkTagPattern,
} = require('../../../../../lib/security');
const {
	sanitize,
	sanitizeCategory,
	schemas,
} = require('../../../../../lib/validation');
const { checkCategoryRefs } = require('../../../../../lib/category-refs');
const { updateStaffRoles } = require('../../../../../lib/users');

const MAX_SETTINGS_SIZE = 10 * 1024 * 1024; // 10 MiB
const CATEGORY_ALLOW = ['ViewChannel', 'ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'AttachFiles'];

const { import: pool } = pools;

function parseJSON(string) {
	try {
		return JSON.parse(string);
	} catch {
		return null;
	}
}

/**
 * Whether a channel is in this server (and, optionally, of one of these types).
 * @param {import('discord.js').Guild} guild
 * @param {string | null | undefined} channelId
 * @param {number[]} [types]
 */
function inGuild(guild, channelId, types) {
	if (!channelId) return false;
	const channel = guild.channels.cache.get(channelId);
	return Boolean(channel) && channel.guildId === guild.id && (!types || types.includes(channel.type));
}

/**
 * Read and check the whole import file without changing anything. Throws if the file can't be imported;
 * fixes what can be fixed (references to other servers' channels and roles) with a warning.
 * @param {object} options
 * @param {import('client')} options.client
 * @param {import('unzipper').File[]} options.files
 * @param {import('discord.js').Guild} options.guild
 * @param {object} options.userLog
 */
async function readImport({
	client, files, guild, userLog,
}) {
	const id = guild.id;
	userLog.info('Reading settings.json');
	const settingsFile = files.find(f => f.path === 'settings.json');
	if (!settingsFile) throw new Error('settings.json is missing');
	if (settingsFile.uncompressedSize > MAX_SETTINGS_SIZE) throw new Error('settings.json is too large');
	const ticketsFile = files.find(f => f.path === 'tickets.jsonl');
	if (!ticketsFile) throw new Error('tickets.jsonl is missing');
	// `settingsJSON` is frozen, `settings` can be mutated
	const settingsJSON = parseJSON(await settingsFile.buffer());
	if (!settingsJSON || typeof settingsJSON !== 'object') throw new Error('settings.json is not valid JSON');
	Object.freeze(settingsJSON);
	if (!Array.isArray(settingsJSON.categories) || !Array.isArray(settingsJSON.tags)) throw new Error('settings.json is not a valid export');

	// only known fields are copied so the file can't write to other guilds' data
	const settings = sanitize(settingsJSON, schemas.guildSettings);
	delete settings.webhookSecret; // never exported; it must be set again
	// a backup from another server can't let its roles into this server's dashboard
	if (settings.dashboardRoles) {
		settings.dashboardRoles = settings.dashboardRoles.filter(roleId => roleId !== id && guild.roles.cache.has(roleId));
	}
	// the bot only posts in this server's channels
	for (const field of ['logChannel', 'transcriptChannel']) {
		if (settings[field] && !inGuild(guild, settings[field], [ChannelType.GuildText, ChannelType.GuildAnnouncement])) {
			userLog.warn(`The ${field === 'logChannel' ? 'log' : 'transcript'} channel isn't in this server, so it has been turned off`);
			settings[field] = null;
		}
	}
	if (Array.isArray(settings.autoTag)) settings.autoTag = settings.autoTag.filter(channelId => inGuild(guild, channelId));
	if (settings.webhookUrl) userLog.warn('The webhook secret (if there was one) must be set again');
	settings.tags = settingsJSON.tags.map(raw => {
		const tag = sanitize(raw, schemas.tag);
		if (tag.regex && !checkTagPattern(tag.regex, tag.matchType).ok) {
			userLog.warn(`Removed the unsafe or invalid pattern from the "${tag.name}" tag`);
			tag.regex = null;
		}
		return tag;
	});
	const tagNames = new Set();
	for (const tag of settings.tags) {
		if (tagNames.has(tag.name)) throw new Error(`settings.json has more than one "${tag.name}" tag`);
		tagNames.add(tag.name);
	}

	// questions get new IDs so a server can be copied to another one on the same instance
	// (the old IDs would still be in use); answers are mapped to the new IDs
	const questionMap = new Map();
	const categoryIds = new Set();
	const categories = settingsJSON.categories.map((raw, i) => {
		const oldId = raw?.id;
		if (!Number.isSafeInteger(oldId)) throw new Error(`Category ${i + 1} in settings.json has no valid ID`);
		if (categoryIds.has(oldId)) throw new Error(`settings.json has more than one category with ID ${oldId}`);
		categoryIds.add(oldId);
		const {
			data,
			questions,
		} = sanitizeCategory(raw);
		if (!data.name) throw new Error(`Category ${oldId} in settings.json has no name`);
		// channels from a backup of another server can't be used here
		const needsDiscordCategory = !inGuild(guild, data.discordCategory, [ChannelType.GuildCategory]);
		if (needsDiscordCategory) {
			userLog.warn(`The "${data.name}" category's Discord category isn't in this server, so a new one will be created`);
			data.discordCategory = undefined;
		}
		if (data.claimedCategory && !inGuild(guild, data.claimedCategory, [ChannelType.GuildCategory])) {
			userLog.warn(`The "${data.name}" category's claimed tickets category isn't in this server, so claimed tickets aren't moved`);
			data.claimedCategory = null;
		}
		if (Array.isArray(data.fallbackCategories)) {
			data.fallbackCategories = data.fallbackCategories.filter(channelId => inGuild(guild, channelId, [ChannelType.GuildCategory]));
		}
		if (data.threadParent && !inGuild(guild, data.threadParent, [ChannelType.GuildText])) {
			userLog.warn(`The "${data.name}" category's thread channel isn't in this server, so it uses channels instead`);
			data.channelType = 'CHANNEL';
			data.threadParent = null;
		}
		if (data.channelType === 'THREAD' && !data.threadParent) data.channelType = 'CHANNEL';
		// drops roles that aren't in this server; the channels have been checked above
		checkCategoryRefs(guild, data, channelId => client.channels.cache.get(channelId));
		data.channelName ||= 'ticket-{num}';
		data.questions = (questions ?? []).map(question => {
			const newId = randomUUID();
			if (question.id) questionMap.set(question.id, newId);
			return {
				...question,
				id: newId,
			};
		});
		return {
			data,
			needsDiscordCategory,
			oldId,
		};
	});

	userLog.info('Reading tickets.jsonl');
	const lines = createInterface({
		crlfDelay: Infinity,
		input: ticketsFile.stream(),
	});
	// tickets are checked against the old category IDs; they're mapped to the new ones in writeImport
	const categoryMap = new Map([...categoryIds].map(categoryId => [categoryId, categoryId]));
	const ticketsPromises = [];
	let lineNumber = 0;
	for await (const line of lines) {
		lineNumber++;
		if (!line.trim()) continue;
		const n = lineNumber;
		// do not await in the loop
		ticketsPromises.push(
			// queue() returns a thenable without catch()
			Promise.resolve(pool.queue(worker => worker.importTicket(line, id, categoryMap, questionMap)))
				.catch(error => {
					throw new Error(`tickets.jsonl line ${n}: ${error.message ?? error}`);
				}),
		);
	}
	const allResolved = await Promise.all(ticketsPromises);

	const ticketIds = new Set();
	const numbers = new Set();
	for (const [ticket] of allResolved) {
		if (ticketIds.has(ticket.id)) throw new Error(`tickets.jsonl has ticket ${ticket.id} more than once`);
		if (numbers.has(ticket.number)) throw new Error(`tickets.jsonl has more than one ticket #${ticket.number}`);
		ticketIds.add(ticket.id);
		numbers.add(ticket.number);
	}

	// ticket IDs are channel IDs, so they're unique across guilds; skip tickets that another server on this
	// instance already has (e.g. copying a server) instead of failing the whole import. This server's own tickets
	// are replaced.
	const existing = new Set((await client.prisma.ticket.findMany({
		select: { id: true },
		where: {
			guildId: { not: id },
			id: { in: [...ticketIds] },
		},
	})).map(ticket => ticket.id));
	if (existing.size > 0) userLog.warn(`Skipped ${existing.size} tickets that are already stored on this instance`);
	// A ticket's ID is its channel's ID, and the bot acts on that channel (it archives its messages, sends
	// replies from the portal to it, and deletes it when the ticket closes). An edited file must not be able to
	// point an open ticket at another server's channel, so a ticket only stays open if its channel is in this
	// server; the rest are imported as closed tickets (their archives are kept).
	const tickets = allResolved.filter(([ticket]) => !existing.has(ticket.id));
	let closedCount = 0;
	for (const [ticket] of tickets) {
		if (ticket.open === false) continue;
		if (inGuild(guild, ticket.id)) continue;
		ticket.open = false;
		ticket.closedAt ??= new Date();
		closedCount++;
	}
	if (closedCount > 0) userLog.warn(`Closed ${closedCount} open tickets whose channels aren't in this server`);
	const importedIds = new Set(tickets.map(([ticket]) => ticket.id));
	for (const [ticket] of tickets) {
		// tickets can only reference other tickets from the same import
		if (ticket.referencesTicket && !importedIds.has(ticket.referencesTicket.connect.id)) delete ticket.referencesTicket;
	}
	userLog.success(`Checked settings.json and ${tickets.length} tickets`);

	return {
		categories,
		settings,
		tickets,
	};
}

/**
 * Replace the server's data with a checked import (see readImport), in a transaction.
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {string} id the guild
 * @param {Awaited<ReturnType<typeof readImport>>} plan
 */
async function writeImport(tx, id, plan) {
	// deleteMany so importing into a guild with no settings row yet doesn't fail; deleting the guild deletes its
	// categories, tickets and everything else (cascades)
	await tx.guild.deleteMany({ where: { id } });
	await tx.guild.create({
		data: {
			...plan.settings,
			id,
			tags: { createMany: { data: plan.settings.tags } },
		},
		// select ID so it doesn't return everything else
		select: { id: true },
	});
	const categoryMap = new Map();
	for (const category of plan.categories) {
		const created = await tx.category.create({
			data: {
				...category.data,
				guild: { connect: { id } },
				questions: { createMany: { data: category.data.questions } },
			},
			select: { id: true },
		});
		category.newId = created.id;
		categoryMap.set(category.oldId, created.id);
	}
	const messages = [];
	for (const [ticket, ticketMessages] of plan.tickets) {
		if (ticket.category) ticket.category = { connect: { id: categoryMap.get(ticket.category.connect.id) } };
		await tx.ticket.create({
			data: ticket,
			select: { id: true },
		});
		messages.push(...ticketMessages);
	}
	if (messages.length > 0) await tx.archivedMessage.createMany({ data: messages });
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

			// Nothing is changed until the whole file has been read and checked, and then everything is replaced in
			// one transaction, so a bad or edited file can't leave the server with half (or none) of its data.
			const plan = await readImport({
				client,
				files,
				guild,
				userLog,
			});

			// new Discord categories for ticket categories whose category isn't in this server (e.g. a backup of
			// another server); the only change made outside the transaction, so they're removed if it fails
			const createdChannels = [];
			try {
				for (const category of plan.categories.filter(c => c.needsDiscordCategory)) {
					const channel = await guild.channels.create({
						name: category.data.name,
						permissionOverwrites: [
							{
								deny: ['ViewChannel'],
								id: guild.roles.everyone,
							},
							{
								allow: CATEGORY_ALLOW,
								id: client.user.id,
							},
							...(category.data.staffRoles ?? []).map(roleId => ({
								allow: CATEGORY_ALLOW,
								id: roleId,
							})),
						],
						reason: `Tickets category imported by ${member.user.username}`,
						type: ChannelType.GuildCategory,
					});
					createdChannels.push(channel);
					category.data.discordCategory = channel.id;
					userLog.info(`Created a Discord category for "${category.data.name}"`);
				}

				userLog.info('Replacing the server\'s data');
				await client.prisma.$transaction(tx => writeImport(tx, id, plan), {
					maxWait: 10_000,
					timeout: 10 * 60_000,
				});
			} catch (error) {
				for (const channel of createdChannels) await channel.delete?.().catch(() => {});
				throw Object.assign(error, { rolledBack: true });
			}
			for (const category of plan.categories) {
				userLog.info(`"${category.data.name}" ID ${category.oldId} -> ${category.newId}`);
			}
			userLog.success(`Imported general settings, ${plan.settings.tags.length} tags, ${plan.categories.length} categories and ${plan.tickets.length} tickets`);

			// the old categories (and their staff roles) are gone
			await updateStaffRoles(guild);
			await client.keyv.delete(`cache/stats/guild:${id}`);
			userLog.success('(DONE) All data has been imported');

		} catch (error) {
			client.log.error(error);
			userLog.error(error.message ?? String(error));
			userLog.error(error.rolledBack
				? 'The import was rolled back. Nothing was changed.'
				: 'The file was not imported. Nothing was changed.');
		} finally {
			res.raw.end();
		}
	},
	onRequest: [fastify.authenticate, fastify.isOwner],
});
