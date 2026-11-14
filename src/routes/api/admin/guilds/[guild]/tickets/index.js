const { pools } = require('../../../../../../lib/threads');
const { anonymiseTicketRow } = require('../../../../../../lib/tickets/anonymous');
const { crypto } = pools;

module.exports.get = fastify => ({
	handler: async req => {
		/** @type {import('client')} */
		const client = req.routeOptions.config.client;
		const { query } = req;
		// TODO: advanced filters
		const tickets = await client.prisma.ticket.findMany({
			include: { category: { select: { anonymous: true } } },
			orderBy: { createdAt: 'asc' },
			where: {
				createdAt: { gte: query.since && new Date((Number(query.since) * 1000) || query.since) },
				guildId: req.params.guild,
			},
		});
		return Promise.all(
			tickets.map(async ticket => {
				ticket.closedReason &&= await crypto.queue(w => w.decrypt(ticket.closedReason));
				ticket.topic &&= await crypto.queue(w => w.decrypt(ticket.topic));
				// admins don't see who handled anonymous tickets either
				const anonymous = Boolean(ticket.category?.anonymous);
				delete ticket.category;
				return anonymiseTicketRow(ticket, anonymous);
			}),
		);
	},
	onRequest: [fastify.authenticate, fastify.isAdmin],
});

