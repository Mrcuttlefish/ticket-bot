const {
	checkWriteRequest, findViewableTicket, getPermissions,
} = require('../../../../../../lib/tickets/portal');

// POST /api/guilds/:guild/tickets/:ticket/close { reason? } (archive portal, upstream #337)
module.exports.post = fastify => ({
	handler: async (req, res) => {
		/** @type {import('client')} */
		const client = req.routeOptions.config.client;
		const invalid = checkWriteRequest(req);
		if (invalid) {
			return res.code(invalid.startsWith('Content-Type') ? 415 : 403).send({
				error: invalid.startsWith('Content-Type') ? 'Unsupported Media Type' : 'Forbidden',
				message: invalid,
				statusCode: invalid.startsWith('Content-Type') ? 415 : 403,
			});
		}
		const found = await findViewableTicket(req, res);
		if (!found) return;
		const {
			staff, ticket,
		} = found;
		if (!getPermissions(ticket, req.user.id, staff).canClose) {
			return res.code(403).send({
				error: 'Forbidden',
				message: 'This ticket is already closed.',
				statusCode: 403,
			});
		}
		const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) || null : null;
		await client.tickets.finallyClose(ticket.id, {
			closedBy: req.user.id,
			reason,
		});
		return { closed: true };
	},
	onRequest: [fastify.authenticate, fastify.isMember],
});
