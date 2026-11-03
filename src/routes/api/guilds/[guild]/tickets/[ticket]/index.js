const {
	findViewableTicket, getPermissions, serializeTicket,
} = require('../../../../../../lib/tickets/portal');
const { pools } = require('../../../../../../lib/threads');

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
			permissions: getPermissions(ticket, req.user.id, staff),
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
