const { pools } = require('../../../../../../lib/threads');
const { anonymiseTicketRow } = require('../../../../../../lib/tickets/anonymous');
const { export: pool } = pools;

module.exports.get = fastify => ({
	handler: async (req, res) => {
		/** @type {import('client')} */
		const client = req.routeOptions.config.client;
		const guildId = req.params.guild;
		const ticketId = req.params.ticket;
		const ticket = await client.prisma.ticket.findUnique({
			include: {
				archivedChannels: true,
				archivedMessages: true,
				archivedRoles: true,
				archivedUsers: true,
				category: { select: { anonymous: true } },
				feedback: true,
				questionAnswers: true,
			},
			where: {
				guildId, // ! prevent unauthorised access
				id: ticketId,
			},
		});

		if (!ticket) return res.status(404).send(new Error('Not Found'));

		const anonymous = Boolean(ticket.category?.anonymous);
		delete ticket.category;
		res.header('Content-Type', 'application/json'); // exportTicket returns stringified JSON
		const exported = await pool.queue(w => w.exportTicket(ticket));
		if (!anonymous) return exported;
		// admins don't see who wrote anonymous staff messages either; only the server's full export has them
		return JSON.stringify(anonymiseTicketRow(JSON.parse(exported), true));
	},
	// tickets aren't settings: dashboard roles can't read them (see app.js isManager)
	onRequest: [fastify.authenticate, fastify.isManager],
});
