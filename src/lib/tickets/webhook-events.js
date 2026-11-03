const { sendWebhook } = require('../webhooks');
// the worker pool is required lazily so this module can be loaded (e.g. in tests) without starting threads
const decrypt = value => (value ? require('../threads').pools.crypto.queue(w => w.decrypt(value)) : null);

/**
 * Build the JSON body for a ticket webhook.
 * @param {'ticket.created' | 'ticket.closed'} event
 * @param {object} ticket a ticket including `guild`, `category` and `questionAnswers.question`, with text already decrypted
 * @returns {object}
 */
function buildPayload(event, ticket) {
	const payload = {
		event,
		guild: { id: ticket.guildId },
		ticket: {
			answers: (ticket.questionAnswers ?? []).map(answer => ({
				question: answer.question?.label ?? answer.questionId,
				questionId: answer.questionId,
				value: answer.value,
			})),
			category: ticket.category && {
				id: ticket.category.id,
				name: ticket.category.name,
			},
			createdAt: ticket.createdAt,
			createdById: ticket.createdById,
			id: ticket.id,
			number: ticket.number,
			topic: ticket.topic,
		},
		timestamp: new Date().toISOString(),
	};
	if (event === 'ticket.closed') {
		Object.assign(payload.ticket, {
			closedAt: ticket.closedAt,
			closedById: ticket.closedById,
			closedReason: ticket.closedReason,
		});
	}
	return payload;
}

/**
 * Send a ticket event to the guild's webhook, if it has one (upstream #474). Failures are logged, not thrown.
 * @param {import("client")} client
 * @param {'ticket.created' | 'ticket.closed'} event
 * @param {string} ticketId
 */
async function sendTicketWebhook(client, event, ticketId) {
	try {
		const ticket = await client.prisma.ticket.findUnique({
			include: {
				category: {
					select: {
						id: true,
						name: true,
					},
				},
				guild: {
					select: {
						webhookSecret: true,
						webhookUrl: true,
					},
				},
				questionAnswers: { include: { question: { select: { label: true } } } },
			},
			where: { id: ticketId },
		});
		if (!ticket?.guild.webhookUrl) return;

		const [topic, closedReason, answers, secret] = await Promise.all([
			decrypt(ticket.topic),
			decrypt(ticket.closedReason),
			Promise.all(ticket.questionAnswers.map(async answer => ({
				...answer,
				value: await decrypt(answer.value),
			}))),
			decrypt(ticket.guild.webhookSecret),
		]);
		const payload = buildPayload(event, {
			...ticket,
			closedReason,
			questionAnswers: answers,
			topic,
		});
		const status = await sendWebhook(ticket.guild.webhookUrl, payload, secret);
		if (status >= 400) client.log.warn(`Webhook for guild ${ticket.guildId} responded with ${status}`);
	} catch (error) {
		client.log.warn(`Failed to send ${event} webhook for ticket ${ticketId}: ${error.message}`);
	}
}

module.exports = {
	buildPayload,
	sendTicketWebhook,
};
