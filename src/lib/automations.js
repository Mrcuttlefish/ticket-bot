/**
 * Automations (Ticket Tool parity, P3): per-category rules like "if staff haven't replied within 4 hours, send the
 * `waiting` tag" or "if the creator hasn't replied within 2 days, close the ticket".
 *
 * Each ticket remembers who should send the next message (`waitingOn`: STAFF when the ticket opens or the creator
 * writes, CREATOR when staff write) and when its last message was. A rule runs once per wait: when its deadline
 * (last message + `after`) has passed since automations last ran for the ticket (`automatedAt`).
 */

const { EmbedBuilder } = require('discord.js');
const { fillTagPlaceholders } = require('./tags');

/**
 * The rules whose deadline is in (since, now], in the order they're due.
 * @param {{ action: string, after: number, tag?: string, waitingOn: string }[]} rules
 * @param {object} ticket
 * @param {Date | null} ticket.automatedAt
 * @param {Date} ticket.createdAt
 * @param {Date | null} ticket.lastMessageAt
 * @param {string | null} ticket.waitingOn
 * @param {number} now
 */
function getDueRules(rules, ticket, now) {
	if (!Array.isArray(rules) || !ticket.waitingOn) return [];
	const lastActivity = new Date(ticket.lastMessageAt ?? ticket.createdAt).getTime();
	const automatedAt = ticket.automatedAt ? new Date(ticket.automatedAt).getTime() : 0;
	const since = Math.max(lastActivity, automatedAt);
	return rules
		.filter(rule => rule.waitingOn === ticket.waitingOn)
		.map(rule => ({
			...rule,
			dueAt: lastActivity + rule.after,
		}))
		.filter(rule => rule.dueAt > since && rule.dueAt <= now)
		.sort((a, b) => a.dueAt - b.dueAt);
}

/**
 * @param {import('client')} client
 * @param {number} [now]
 * @returns {Promise<{ closed: number, tagged: number }>}
 */
async function runAutomations(client, now = Date.now()) {
	const result = {
		closed: 0,
		tagged: 0,
	};
	const categories = (await client.prisma.category.findMany({
		select: {
			automations: true,
			id: true,
		},
	})).filter(category => Array.isArray(category.automations) && category.automations.length > 0);
	if (!categories.length) return result;
	const rules = new Map(categories.map(category => [category.id, category.automations]));

	const tickets = await client.prisma.ticket.findMany({
		select: {
			automatedAt: true,
			categoryId: true,
			createdAt: true,
			createdById: true,
			guild: {
				select: {
					locale: true,
					primaryColour: true,
				},
			},
			guildId: true,
			id: true,
			lastMessageAt: true,
			number: true,
			waitingOn: true,
		},
		where: {
			categoryId: { in: [...rules.keys()] },
			open: true,
			waitingOn: { not: null },
		},
	});

	for (const ticket of tickets) {
		const due = getDueRules(rules.get(ticket.categoryId), ticket, now);
		if (!due.length) continue;
		try {
			// archived thread tickets aren't cached
			const channel = client.channels.cache.get(ticket.id) ?? await client.channels.fetch(ticket.id).catch(() => null);
			if (!channel) continue;
			let closed = false;
			for (const rule of due) {
				if (rule.action === 'CLOSE') {
					await client.tickets.finallyClose(ticket.id, { reason: 'automation: no reply' });
					result.closed++;
					closed = true;
					break;
				}
				if (rule.action === 'TAG') {
					const tag = await client.prisma.tag.findUnique({
						select: { content: true },
						where: {
							guildId_name: {
								guildId: ticket.guildId,
								name: rule.tag,
							},
						},
					});
					if (!tag) {
						client.log.warn(`Automation in category ${ticket.categoryId} uses the "${rule.tag}" tag, which doesn't exist`);
						continue;
					}
					const creator = await channel.guild.members.fetch(ticket.createdById).catch(() => null);
					await channel.send({
						// only the creator is mentioned, never roles or everyone
						allowedMentions: { users: [ticket.createdById] },
						embeds: [
							new EmbedBuilder()
								.setColor(ticket.guild.primaryColour)
								.setDescription(fillTagPlaceholders(tag.content, {
									channel,
									guild: channel.guild,
									ticket: {
										createdById: ticket.createdById,
										number: ticket.number,
									},
									user: creator ?? { id: ticket.createdById },
								})),
						],
					});
					result.tagged++;
				}
			}
			if (!closed) {
				await client.prisma.ticket.update({
					data: { automatedAt: new Date(now) },
					where: { id: ticket.id },
				});
			}
		} catch (error) {
			client.log.warn(`Failed to run automations for ticket ${ticket.id}`);
			client.log.error(error);
		}
	}
	return result;
}

module.exports = {
	getDueRules,
	runAutomations,
};
