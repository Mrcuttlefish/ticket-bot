const ms = require('ms');

// the creator counts as active if they sent a message in their ticket this recently
const ACTIVE_FOR = ms('5m');

/**
 * Decide whether a message should ghost ping the ticket's creator (upstream #346).
 * The creator is pinged (and the ping deleted straight away) when staff reply while they aren't active,
 * but only once until the creator sends a message, so a burst of staff messages only pings them once.
 * @param {object} data
 * @param {boolean} data.enabled the guild's ghostPing setting
 * @param {boolean} data.staff whether the message author is staff
 * @param {boolean} data.isCreator whether the message author is the ticket's creator
 * @param {boolean} data.creatorActive whether the creator sent a message recently
 * @param {boolean} data.alreadyPinged whether the creator has been ghost pinged since their last message
 * @param {boolean} data.mentionsCreator whether the message already mentions the creator
 * @returns {boolean}
 */
function shouldGhostPing({
	enabled, staff, isCreator, creatorActive, alreadyPinged, mentionsCreator,
}) {
	return Boolean(enabled && staff && !isCreator && !creatorActive && !alreadyPinged && !mentionsCreator);
}

/**
 * @param {import("client")} client
 * @param {import("discord.js").Message} message
 * @param {object} ticket
 * @param {object} settings
 * @param {boolean} staff
 */
async function handleGhostPing(client, message, ticket, settings, staff) {
	const activeKey = `ghost-ping/active:${ticket.id}`;
	const pingedKey = `ghost-ping/pinged:${ticket.id}`;
	const isCreator = message.author.id === ticket.createdById;

	if (isCreator) {
		await client.keyv.set(activeKey, true, ACTIVE_FOR);
		await client.keyv.delete(pingedKey);
		return false;
	}

	const ping = shouldGhostPing({
		alreadyPinged: await client.keyv.has(pingedKey),
		creatorActive: await client.keyv.has(activeKey),
		enabled: settings.ghostPing,
		isCreator,
		mentionsCreator: message.mentions.users.has(ticket.createdById),
		staff,
	});
	if (!ping) return false;

	await client.keyv.set(pingedKey, true, ms('7d'));
	const sent = await message.channel.send({
		allowedMentions: { users: [ticket.createdById] },
		content: `<@${ticket.createdById}>`,
	});
	await sent.delete();
	return true;
}

module.exports = {
	handleGhostPing,
	shouldGhostPing,
};
