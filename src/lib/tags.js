/**
 * Fill placeholders in tag content (upstream #438).
 *
 * Supported: {user} (mention), {user.name}, {user.id}, {author} (mention of whoever triggered the tag),
 * {channel}, {server}, {ticket.number}, {ticket.creator} (mention), {ticket.topic}.
 * Unknown placeholders and ones without a value (e.g. ticket placeholders outside a ticket) are left as they are.
 *
 * @param {string} content
 * @param {object} context
 * @param {{ id: string, username?: string, displayName?: string }} [context.user] who the tag is for
 * @param {{ id: string }} [context.author] who triggered the tag
 * @param {{ id: string }} [context.channel]
 * @param {{ name: string }} [context.guild]
 * @param {{ number?: number, createdById?: string, topic?: string }} [context.ticket]
 * @returns {string}
 */
function fillTagPlaceholders(content, {
	author, channel, guild, ticket, user,
} = {}) {
	const values = {
		'author': author && `<@${author.id}>`,
		'channel': channel && `<#${channel.id}>`,
		'server': guild?.name,
		'ticket.creator': ticket?.createdById && `<@${ticket.createdById}>`,
		'ticket.number': ticket?.number,
		'ticket.topic': ticket?.topic,
		'user': user && `<@${user.id}>`,
		'user.id': user?.id,
		'user.name': user && (user.displayName ?? user.username),
	};
	return String(content).replace(/\{\s*([a-z.]+)\s*\}/gi, (match, key) => {
		const value = values[key.toLowerCase()];
		return value === undefined || value === null || value === '' ? match : String(value);
	});
}

module.exports = { fillTagPlaceholders };
