const {
	getUsers, getViewer, serializeTicket,
} = require('../../../../../lib/tickets/portal');

const SNOWFLAKE = /^\d{17,20}$/;

const badRequest = (res, message) => res.code(400).send({
	error: 'Bad Request',
	message,
	statusCode: 400,
});

// GET /api/guilds/:guild/tickets?open=&category=&creator=&q=&cursor=&limit= (archive portal, upstream #337)
module.exports.get = fastify => ({
	handler: async (req, res) => {
		/** @type {import('client')} */
		const client = req.routeOptions.config.client;
		const {
			guild, staff,
		} = await getViewer(client, req.params.guild, req.user.id);
		const query = req.query ?? {};
		const limit = Math.min(Math.max(parseInt(query.limit) || 25, 1), 100);

		const where = { guildId: guild.id };
		if (query.open === 'true') where.open = true;
		else if (query.open === 'false') where.open = false;
		if (query.category !== undefined && query.category !== '') {
			const category = parseInt(query.category);
			if (!Number.isSafeInteger(category)) return badRequest(res, 'Invalid category.');
			where.categoryId = category;
		}
		// people who aren't staff can only see their own tickets
		if (!staff) {
			where.createdById = req.user.id;
		} else if (query.creator) {
			if (!SNOWFLAKE.test(query.creator)) return badRequest(res, 'Invalid creator.');
			where.createdById = query.creator;
		}

		const q = String(query.q ?? '').trim().toLowerCase();
		if (/^#?\d+$/.test(q)) where.number = parseInt(q.replace('#', ''));

		const findMany = args => client.prisma.ticket.findMany({
			include: {
				_count: { select: { archivedMessages: true } },
				category: true,
			},
			orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
			where,
			...args,
		});

		let tickets;
		let next = null;
		if (q && where.number === undefined) {
			// topics are encrypted, so a text search decrypts the most recent 500 matching tickets
			const candidates = await Promise.all((await findMany({ take: 500 })).map(t => serializeTicket(t, staff)));
			const matches = candidates.filter(t => t.topic?.toLowerCase().includes(q));
			const start = query.cursor ? matches.findIndex(t => t.id === query.cursor) + 1 : 0;
			tickets = matches.slice(start, start + limit);
			if (start + limit < matches.length) next = tickets[tickets.length - 1].id;
		} else {
			const rows = await findMany({
				...(query.cursor && SNOWFLAKE.test(query.cursor) && {
					cursor: { id: query.cursor },
					skip: 1,
				}),
				take: limit + 1,
			});
			if (rows.length > limit) {
				rows.length = limit;
				next = rows[rows.length - 1].id;
			}
			tickets = await Promise.all(rows.map(t => serializeTicket(t, staff)));
		}

		return {
			next,
			tickets,
			users: await getUsers(guild, tickets.flatMap(t => [t.createdById, t.claimedById])),
		};
	},
	onRequest: [fastify.authenticate, fastify.isMember],
});
