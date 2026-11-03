/**
 * Anonymous tickets: in categories with `anonymous` turned on, messages from staff are deleted and posted again
 * by the bot under a generic "Staff" name, so the ticket's creator can't see which staff member replied.
 *
 * The original message is archived first, with its real author, so staff (and admins reading transcripts or the
 * archive) can still see who wrote what. Things the creator can see are anonymised: transcripts they download,
 * the claim, release and close request messages, and the "closed by" field in the closing DM.
 *
 * Limits: Discord shows who used a slash command, and staff with access to the channel are listed in its member
 * list. Use the buttons rather than slash commands in anonymous tickets.
 */

const ExtendedEmbedBuilder = require('../embed');

// relayed messages are sent with a nonce starting with this, so the archiver can skip them (the original is
// archived instead) without waiting for `send()` to resolve
const NONCE_PREFIX = 'anon';

/**
 * @param {object} options
 * @param {import('discord.js').Message} options.message
 * @param {{ createdById: string, category?: { anonymous?: boolean } | null }} options.ticket
 * @param {boolean} options.staff whether the author is staff
 * @returns {boolean}
 */
function shouldRelay({
	message,
	staff,
	ticket,
}) {
	if (!ticket.category?.anonymous) return false;
	if (!staff || message.author.bot || message.webhookId) return false;
	if (message.author.id === ticket.createdById) return false; // staff can open tickets too
	if (message.system) return false;
	return Boolean(message.content || message.attachments.size || message.stickers?.size);
}

/**
 * @param {import('discord.js').Message} message
 * @param {string} clientUserId
 * @returns {boolean} whether the message is a relay of an anonymous staff message
 */
function isRelay(message, clientUserId) {
	return message.author?.id === clientUserId && typeof message.nonce === 'string' && message.nonce.startsWith(NONCE_PREFIX);
}

/**
 * Post a staff message again as the bot, then delete the original.
 * @param {import('client')} client
 * @param {import('discord.js').Message} message
 * @param {object} settings the guild's settings
 * @param {(key: string, args?: object) => string} getMessage
 * @returns {Promise<import('discord.js').Message>}
 */
async function relayMessage(client, message, settings, getMessage) {
	const embed = new ExtendedEmbedBuilder()
		.setColor(settings.primaryColour)
		.setAuthor({
			iconURL: message.guild.iconURL() ?? undefined,
			name: getMessage('ticket.anonymous.staff'),
		});
	if (message.content) embed.setDescription(message.content);
	const relay = await message.channel.send({
		allowedMentions: { parse: ['users'] }, // never @everyone or roles from a relay
		embeds: [embed],
		enforceNonce: true,
		files: [...message.attachments.values()].map(a => ({
			attachment: a.url,
			name: a.name,
		})),
		nonce: `${NONCE_PREFIX}${message.id.slice(-20)}`.slice(0, 25),
		reply: message.reference?.messageId
			? {
				failIfNotExists: false,
				messageReference: message.reference.messageId,
			}
			: undefined,
	});
	// the archived original must not be marked as deleted
	client.tickets.$relayed.add(message.id);
	await message.delete().catch(error => {
		client.tickets.$relayed.delete(message.id);
		throw error;
	});
	return relay;
}

/**
 * Hide staff in a decoded transcript (see workers/transcript.js) for someone who isn't staff.
 * Everyone except the ticket's creator and bots is shown as "Staff".
 * @param {object} ticket
 * @param {string} staffName
 * @returns {object} the same ticket
 */
function anonymiseTranscript(ticket, staffName) {
	const staff = {
		avatar: null,
		bot: false,
		discriminator: '0',
		displayName: staffName,
		roleId: null,
		userId: '0',
		username: staffName,
	};
	const isHidden = user => Boolean(user) && user.userId !== ticket.createdById && !user.bot;
	const hide = user => (isHidden(user) ? staff : user);
	ticket.archivedUsers = ticket.archivedUsers.filter(user => !isHidden(user)).concat(staff);
	for (const message of ticket.archivedMessages) message.author = hide(message.author);
	ticket.claimedBy = hide(ticket.claimedBy);
	ticket.closedBy = hide(ticket.closedBy);
	return ticket;
}

module.exports = {
	NONCE_PREFIX,
	anonymiseTranscript,
	isRelay,
	relayMessage,
	shouldRelay,
};
