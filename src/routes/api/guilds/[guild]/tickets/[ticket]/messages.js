const {
	Collection, EmbedBuilder, SnowflakeUtil,
} = require('discord.js');
const {
	RateLimit, checkWriteRequest, findViewableTicket, getPermissions, serializeMessages,
} = require('../../../../../../lib/tickets/portal');
const { WEB_NONCE_PREFIX } = require('../../../../../../lib/tickets/anonymous');

const ARCHIVE_INCLUDE = {
	archivedRoles: true,
	archivedUsers: true,
};

// 5 replies per 10 seconds per user
const rateLimit = new RateLimit(5, 10_000);

const error = (res, code, message) => res.code(code).send({
	error: {
		400: 'Bad Request',
		403: 'Forbidden',
		415: 'Unsupported Media Type',
		429: 'Too Many Requests',
		503: 'Service Unavailable',
	}[code],
	message,
	statusCode: code,
});

// GET /api/guilds/:guild/tickets/:ticket/messages?cursor=&limit= (archive portal, upstream #337), oldest first
module.exports.get = fastify => ({
	handler: async (req, res) => {
		/** @type {import('client')} */
		const client = req.routeOptions.config.client;
		const found = await findViewableTicket(req, res, ARCHIVE_INCLUDE);
		if (!found) return;
		const { ticket } = found;
		const limit = Math.min(Math.max(parseInt(req.query?.limit) || 100, 1), 200);
		const cursor = /^\d{17,20}$/.test(req.query?.cursor ?? '') ? req.query.cursor : null;
		const rows = await client.prisma.archivedMessage.findMany({
			orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
			take: limit + 1,
			where: { ticketId: ticket.id },
			...(cursor && {
				cursor: { id: cursor },
				skip: 1,
			}),
		});
		let next = null;
		if (rows.length > limit) {
			rows.length = limit;
			next = rows[rows.length - 1].id;
		}
		return {
			messages: await serializeMessages(client, ticket, rows),
			next,
		};
	},
	onRequest: [fastify.authenticate, fastify.isMember],
});

// POST /api/guilds/:guild/tickets/:ticket/messages { content } — reply from the portal
module.exports.post = fastify => ({
	handler: async (req, res) => {
		/** @type {import('client')} */
		const client = req.routeOptions.config.client;
		const invalid = checkWriteRequest(req);
		if (invalid) return error(res, invalid.startsWith('Content-Type') ? 415 : 403, invalid);

		const found = await findViewableTicket(req, res, ARCHIVE_INCLUDE);
		if (!found) return;
		const {
			guild, staff, ticket,
		} = found;
		if (!getPermissions(ticket, req.user.id, staff).canReply) return error(res, 403, 'This ticket is closed.');

		const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
		if (content.length < 1 || content.length > 2000) return error(res, 400, 'Messages must be 1 to 2000 characters.');
		if (!rateLimit.take(req.user.id)) return error(res, 429, 'You\'re sending messages too quickly.');

		const channel = client.channels.cache.get(ticket.id);
		if (!channel) return error(res, 503, 'The ticket\'s channel can\'t be found.');
		const member = await guild.members.fetch(req.user.id);
		const settings = await client.prisma.guild.findUnique({
			select: {
				locale: true,
				primaryColour: true,
			},
			where: { id: guild.id },
		});
		const getMessage = client.i18n.getLocale(settings.locale);

		// anonymous tickets hide staff in the channel too (see anonymous.js)
		const hideAuthor = ticket.category?.anonymous && staff && ticket.createdById !== req.user.id;
		const sent = await channel.send({
			allowedMentions: { parse: [] }, // web replies can't ping anyone
			embeds: [
				new EmbedBuilder()
					.setColor(settings.primaryColour)
					.setAuthor(hideAuthor
						? { name: getMessage('ticket.anonymous.staff') }
						: {
							iconURL: member.displayAvatarURL(),
							name: getMessage('ticket.web_reply.author', { name: member.displayName }),
						})
					.setDescription(content),
			],
			enforceNonce: true,
			nonce: `${WEB_NONCE_PREFIX}${SnowflakeUtil.generate()}`.slice(0, 25),
		});

		if (hideAuthor) client.log.info.tickets(`Anonymous web reply ${sent.id} in ticket ${ticket.id} was sent by ${member.user.tag} (${member.id})`);

		// archived with the real author, like messages sent in Discord
		await client.tickets.archiver.saveMessage(ticket.id, {
			attachments: new Collection(),
			author: member.user,
			components: [],
			content,
			createdAt: sent.createdAt ?? new Date(),
			editedAt: null,
			embeds: [],
			guild,
			id: sent.id,
			member,
			mentions: {
				channels: new Collection(),
				members: new Collection(),
				roles: new Collection(),
			},
			reference: null,
			viaWeb: true,
		});

		const data = { lastMessageAt: new Date() };
		if (staff && !ticket.firstResponseAt && ticket.createdById !== req.user.id) data.firstResponseAt = new Date();
		await client.prisma.ticket.update({
			data,
			where: { id: ticket.id },
		});
		client.tickets.$stale.delete(ticket.id);

		const fresh = await client.prisma.ticket.findUnique({
			include: {
				category: true,
				...ARCHIVE_INCLUDE,
			},
			where: { id: ticket.id },
		});
		const archived = await client.prisma.archivedMessage.findUnique({ where: { id: sent.id } });
		const [message] = archived ? await serializeMessages(client, fresh, [archived]) : [null];
		return res.code(201).send({ message });
	},
	onRequest: [fastify.authenticate, fastify.isMember],
});
