/**
 * Closed tickets whose channel is kept (Ticket Tool parity, batch A).
 *
 * By default a ticket's channel is deleted when it closes. A category can set `keepClosedFor` to keep the
 * channel instead: the creator and the members who were added lose access, and staff get a message with
 * Reopen, Transcript and Delete buttons. `keepClosedFor` is how long to keep it (0: until a staff member
 * deletes it). The deletion time is stored on the ticket (`channelDeleteAt`) so it survives restarts.
 */

const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	OverwriteType,
} = require('discord.js');
const { buttonEmoji } = require('../icons');

/**
 * Whether a category keeps ticket channels after they close.
 * @param {{ keepClosedFor?: number | null } | null | undefined} category
 * @returns {boolean}
 */
function keepsClosedChannels(category) {
	return category?.keepClosedFor !== null && category?.keepClosedFor !== undefined;
}

/**
 * When a kept channel should be deleted.
 * @param {Date} closedAt
 * @param {number | null | undefined} keepClosedFor milliseconds; 0 or less keeps it until it's deleted by hand
 * @returns {Date | null}
 */
function getChannelDeleteAt(closedAt, keepClosedFor) {
	if (!keepClosedFor || keepClosedFor <= 0) return null;
	return new Date(closedAt.getTime() + keepClosedFor);
}

/**
 * The members whose access is removed when a ticket closes: everyone with a member overwrite (the creator and
 * anyone added with /add) except the bot and staff (e.g. the member who claimed the ticket).
 * @param {{ id: string, type: number }[]} overwrites
 * @param {object} options
 * @param {string} options.botId
 * @param {(id: string) => boolean} options.isStaffId
 * @returns {string[]}
 */
function getMembersToLock(overwrites, {
	botId, isStaffId,
}) {
	return overwrites
		.filter(o => o.type === OverwriteType.Member && o.id !== botId && !isStaffId(o.id))
		.map(o => o.id);
}

/**
 * The members whose access is given back when a ticket is reopened: the ones that were locked out.
 * The creator always gets access back, even if their overwrite was removed while the ticket was closed.
 * @param {{ id: string, type: number, deny: { has: (perm: string) => boolean } }[]} overwrites
 * @param {object} options
 * @param {string} options.botId
 * @param {string} options.creatorId
 * @param {(id: string) => boolean} options.isStaffId
 * @returns {string[]}
 */
function getMembersToUnlock(overwrites, {
	botId, creatorId, isStaffId,
}) {
	const ids = overwrites
		.filter(o => o.type === OverwriteType.Member && o.id !== botId && !isStaffId(o.id) && o.deny.has('ViewChannel'))
		.map(o => o.id);
	if (!ids.includes(creatorId)) ids.push(creatorId);
	return ids;
}

/**
 * The buttons on the "ticket closed" message in a kept channel.
 * @param {(key: string, args?: object) => string} getMessage
 * @param {object} options
 * @param {string} options.ticketId
 * @param {boolean} options.transcript whether the ticket was archived
 * @returns {ActionRowBuilder}
 */
function buildClosedControls(getMessage, {
	ticketId, transcript,
}) {
	const row = new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(JSON.stringify({ action: 'reopen' }))
			.setStyle(ButtonStyle.Success)
			.setEmoji(buttonEmoji(getMessage, 'reopen'))
			.setLabel(getMessage('buttons.reopen.text')),
	);
	if (transcript) {
		row.addComponents(
			new ButtonBuilder()
				.setCustomId(JSON.stringify({
					action: 'transcript',
					ticket: ticketId,
				}))
				.setStyle(ButtonStyle.Primary)
				.setEmoji(buttonEmoji(getMessage, 'transcript'))
				.setLabel(getMessage('buttons.transcript.text')),
		);
	}
	row.addComponents(
		new ButtonBuilder()
			.setCustomId(JSON.stringify({ action: 'delete' }))
			.setStyle(ButtonStyle.Danger)
			.setEmoji(buttonEmoji(getMessage, 'delete'))
			.setLabel(getMessage('buttons.delete.text')),
	);
	return row;
}

/**
 * Staff IDs among the given members (anyone the bot treats as staff: staff roles, Manage Server, operators).
 * @param {import('discord.js').Guild} guild
 * @param {string[]} ids
 * @returns {Promise<Set<string>>}
 */
async function findStaff(guild, ids) {
	const { isStaff } = require('../users');
	const staff = new Set();
	for (const id of ids) if (await isStaff(guild, id)) staff.add(id);
	return staff;
}

/**
 * Remove the creator's and added members' access to a closed ticket's channel.
 * @param {import('discord.js').GuildChannel} channel
 * @param {string} reason audit log reason
 * @returns {Promise<string[]>} the members who were locked out
 */
async function lockChannel(channel, reason) {
	const overwrites = [...channel.permissionOverwrites.cache.values()];
	const staff = await findStaff(channel.guild, overwrites.filter(o => o.type === OverwriteType.Member).map(o => o.id));
	const ids = getMembersToLock(overwrites, {
		botId: channel.client.user.id,
		isStaffId: id => staff.has(id),
	});
	for (const id of ids) {
		await channel.permissionOverwrites.edit(id, {
			SendMessages: false,
			ViewChannel: false,
		}, {
			reason,
			type: OverwriteType.Member,
		});
	}
	return ids;
}

/**
 * Give access back to the members who were locked out when the ticket closed.
 * @param {import('discord.js').GuildChannel} channel
 * @param {string} creatorId
 * @param {string} reason audit log reason
 * @returns {Promise<string[]>}
 */
async function unlockChannel(channel, creatorId, reason) {
	const overwrites = [...channel.permissionOverwrites.cache.values()];
	const staff = await findStaff(channel.guild, overwrites.filter(o => o.type === OverwriteType.Member).map(o => o.id));
	const ids = getMembersToUnlock(overwrites, {
		botId: channel.client.user.id,
		creatorId,
		isStaffId: id => staff.has(id),
	});
	for (const id of ids) {
		// the creator may have left the server
		await channel.permissionOverwrites.edit(id, {
			AttachFiles: true,
			EmbedLinks: true,
			ReadMessageHistory: true,
			SendMessages: true,
			ViewChannel: true,
		}, {
			reason,
			type: OverwriteType.Member,
		}).catch(error => channel.client.log.warn(`Couldn't give ${id} access to ticket ${channel.id}`, error));
	}
	return ids;
}

/**
 * Delete kept channels whose time is up.
 * @param {import('../../client')} client
 * @returns {Promise<number>} the number of channels deleted
 */
async function deleteExpiredChannels(client) {
	const tickets = await client.prisma.ticket.findMany({
		select: {
			guildId: true,
			id: true,
		},
		where: {
			channelDeleteAt: { lte: new Date() },
			open: false,
		},
	});
	let deleted = 0;
	for (const ticket of tickets) {
		const channel = client.channels.cache.get(ticket.id);
		try {
			if (channel?.guildId === ticket.guildId && channel.deletable) {
				await channel.delete('Closed ticket channel expired');
				deleted++;
			}
		} catch (error) {
			client.log.warn(`Failed to delete the channel of closed ticket ${ticket.id}`, error);
		} finally {
			// whether or not it worked, don't try again every minute (the channel may already be gone)
			await client.prisma.ticket.update({
				data: { channelDeleteAt: null },
				where: { id: ticket.id },
			}).catch(error => client.log.error(error));
		}
	}
	if (deleted) client.log.info.tickets(`Deleted ${deleted} expired closed ticket channel(s)`);
	return deleted;
}

module.exports = {
	buildClosedControls,
	deleteExpiredChannels,
	getChannelDeleteAt,
	getMembersToLock,
	getMembersToUnlock,
	keepsClosedChannels,
	lockChannel,
	unlockChannel,
};
