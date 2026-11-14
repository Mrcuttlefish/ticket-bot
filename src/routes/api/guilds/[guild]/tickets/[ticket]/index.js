const {
	findViewableTicket, getPermissions, serializeTicket,
} = require('../../../../../../lib/tickets/portal');
const { pools } = require('../../../../../../lib/threads');
const { canDo } = require('../../../../../../lib/buttons');

const { crypto } = pools;

// GET /api/guilds/:guild/tickets/:ticket (archive portal, upstream #337)
module.exports.get = fastify => ({
	handler: async (req, res) => {
		const found = await findViewableTicket(req, res, {
			_count: { select: { archivedMessages: true } },
			feedback: true,
			questionAnswers: { include: { question: true } },
		});
		if (!found) return;
		const {
			staff, ticket,
		} = found;
		const permissions = getPermissions(ticket, req.user.id, staff);
		// hide the close button from roles the close button's limits leave out (see lib/buttons.js)
		if (permissions.canClose) {
			/** @type {import('client')} */
			const client = req.routeOptions.config.client;
			const guild = client.guilds.cache.get(ticket.guildId);
			permissions.canClose = Boolean(guild) && await canDo(client, guild, req.user.id, 'close');
		}
		const decrypt = value => (value ? crypto.queue(w => w.decrypt(value)) : value);
		return {
			...await serializeTicket(ticket),
			closedReason: ticket.closedReason ? await decrypt(ticket.closedReason) : null,
			feedback: ticket.feedback
				? {
					comment: ticket.feedback.comment ? await decrypt(ticket.feedback.comment) : null,
					rating: ticket.feedback.rating,
				}
				: null,
			permissions,
			questionAnswers: await Promise.all(ticket.questionAnswers.map(async answer => ({
				label: answer.question.label,
				questionId: answer.questionId,
				type: answer.question.type,
				value: answer.value ? await decrypt(answer.value) : '',
			}))),
		};
	},
	onRequest: [fastify.authenticate, fastify.isMember],
});
