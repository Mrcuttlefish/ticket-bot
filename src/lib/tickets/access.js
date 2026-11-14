/**
 * Who can see a ticket. Ticket channels use permission overwrites; thread tickets (Ticket Tool parity, P3:
 * a category's `channelType` THREAD) are private threads in a text channel (`threadParent`), so members are added to
 * and removed from the thread instead. Staff need to be able to see the parent channel.
 */

const { ChannelType } = require('discord.js');

const MEMBER_ALLOW = {
	AttachFiles: true,
	EmbedLinks: true,
	ReadMessageHistory: true,
	SendMessages: true,
	ViewChannel: true,
};

/**
 * @param {object | null | undefined} channel
 * @returns {boolean}
 */
const isThreadTicket = channel => channel?.type === ChannelType.PrivateThread || channel?.isThread?.() === true;

/**
 * Let a member see and talk in a ticket.
 * @param {import('discord.js').GuildTextBasedChannel} channel
 * @param {import('discord.js').GuildMember | import('discord.js').User | string} member
 * @param {string} reason
 */
async function grantAccess(channel, member, reason) {
	if (isThreadTicket(channel)) return await channel.members.add(member.id ?? member);
	return await channel.permissionOverwrites.edit(member, MEMBER_ALLOW, { reason });
}

/**
 * Take a member out of a ticket.
 * @param {import('discord.js').GuildTextBasedChannel} channel
 * @param {import('discord.js').GuildMember | import('discord.js').User | string} member
 * @param {string} reason
 */
async function revokeAccess(channel, member, reason) {
	if (isThreadTicket(channel)) return await channel.members.remove(member.id ?? member);
	return await channel.permissionOverwrites.delete(member, reason);
}

/**
 * The text channel a category's thread tickets go in, if it's set and still a text channel in the server.
 * @param {import('discord.js').Guild} guild
 * @param {object} category
 * @returns {import('discord.js').TextChannel | null}
 */
function getThreadParent(guild, category) {
	if (category?.channelType !== 'THREAD' || !category.threadParent) return null;
	const channel = guild.channels.cache.get(category.threadParent);
	return channel?.type === ChannelType.GuildText ? channel : null;
}

/**
 * Create a thread ticket: a private thread that only the creator and staff (added by mentioning the staff roles) can
 * see. Members can't invite others; staff add them with /add.
 * @param {object} options
 * @param {import('discord.js').TextChannel} options.parent
 * @param {object} options.category
 * @param {import('discord.js').GuildMember} options.creator
 * @param {string} options.name
 * @param {string} options.reason
 * @returns {Promise<import('discord.js').ThreadChannel>}
 */
async function createThreadTicket({
	category, creator, name, parent, reason,
}) {
	const thread = await parent.threads.create({
		autoArchiveDuration: 10080,
		invitable: false,
		name,
		reason,
		type: ChannelType.PrivateThread,
	});
	await thread.members.add(creator.id);
	if (category.ratelimit) await thread.setRateLimitPerUser(category.ratelimit).catch(() => null);
	const roles = category.staffRoles ?? [];
	if (roles.length) {
		// mentioning a role adds its members who can see the parent channel; the message isn't needed afterwards
		const added = await thread.send({
			allowedMentions: { roles },
			content: roles.map(id => `<@&${id}>`).join(' '),
		});
		await added.delete().catch(() => null);
	}
	return thread;
}

module.exports = {
	MEMBER_ALLOW,
	createThreadTicket,
	getThreadParent,
	grantAccess,
	isThreadTicket,
	revokeAccess,
};
