const { serializeTicket } = require('../../../../../lib/tickets/portal');

// the viewer's own tickets, in the portal's ticket shape (raw rows would show who claimed or closed anonymous tickets)
module.exports.get = fastify => ({
	handler: async req => {
		const { client } = req.routeOptions.config;
		/** @type {import("@prisma/client").PrismaClient} */
		const prisma = client.prisma;
		const guild = client.guilds.cache.get(req.params.guild);
		const tickets = await prisma.ticket.findMany({
			include: {
				_count: { select: { archivedMessages: true } },
				category: true,
			},
			orderBy: { createdAt: 'desc' },
			where: {
				createdById: req.user.id,
				guildId: guild.id,
			},
		});
		return Promise.all(tickets.map(ticket => serializeTicket(ticket)));
	},
	onRequest: [fastify.authenticate, fastify.isMember],
});
