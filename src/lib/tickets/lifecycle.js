/**
 * Ticket Tool parity, P2: things that happen around a ticket's lifecycle.
 *
 * - Creator roles (`category.creatorRoles`): roles given to or taken from the ticket's creator when the ticket is
 *   opened, claimed or closed. Because this lets the bot hand out roles, the dashboard only accepts roles that the
 *   admin saving them could manage themselves, that the bot can manage, and that don't grant moderation or admin
 *   permissions. The same permission check runs again before each change, in case a role was edited since.
 * - Lifecycle messages: a DM when a ticket opens (`openDm`), extra text for the closed message and DM
 *   (`closedMessage`), and a message when it's reopened (`reopenedMessage`), with the opening message placeholders
 *   plus `{claimer}`, `{reason}` and `{age}`.
 * - A private staff thread in each ticket (`staffThread`).
 * - Closed-ticket limits (`closedLimit`).
 */

const {
	ChannelType,
	PermissionsBitField,
} = require('discord.js');
const ms = require('ms');
const { ValidationError } = require('../validation');
const { formatOpeningMessage } = require('./placeholders');

const { Flags } = PermissionsBitField;

// roles with any of these can't be handed out automatically: anyone who can open a ticket would get them
const DANGEROUS_PERMISSIONS = [
	Flags.Administrator,
	Flags.BanMembers,
	Flags.KickMembers,
	Flags.ManageChannels,
	Flags.ManageGuild,
	Flags.ManageGuildExpressions,
	Flags.ManageMessages,
	Flags.ManageNicknames,
	Flags.ManageRoles,
	Flags.ManageThreads,
	Flags.ManageWebhooks,
	Flags.MentionEveryone,
	Flags.ModerateMembers,
	Flags.MoveMembers,
	Flags.MuteMembers,
	Flags.DeafenMembers,
	Flags.ViewAuditLog,
];

/**
 * Why a role can't be used as a creator role, or null if it can.
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').Role | undefined} role
 * @param {object} options
 * @param {boolean} options.adding whether the role is given (removing a role doesn't grant anything)
 * @returns {string | null}
 */
function creatorRoleProblem(guild, role, { adding }) {
	if (!role) return 'is not a role in this server';
	if (role.id === guild.id) return 'is @everyone';
	if (role.managed) return 'is managed by an integration';
	if (adding && DANGEROUS_PERMISSIONS.some(flag => role.permissions.has(flag, false))) {
		return 'has moderation or admin permissions, so it can\'t be given to everyone who opens a ticket';
	}
	const me = guild.members.me;
	if (me && me.roles.highest.comparePositionTo(role) <= 0) return 'is above the bot\'s highest role';
	return null;
}

/**
 * Check creator roles before they're saved. The admin must be able to manage each role themselves (they're the
 * server owner, or they have Manage Roles and a higher role), otherwise Manage Server would be enough to give
 * yourself any role by opening a ticket.
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').GuildMember} admin the member saving the settings
 * @param {Record<string, { add: string[], remove: string[] }>} creatorRoles already validated (validation.js)
 */
function checkCreatorRoles(guild, admin, creatorRoles) {
	const owner = guild.ownerId === admin.id;
	for (const [event, change] of Object.entries(creatorRoles ?? {})) {
		for (const [list, adding] of [['add', true], ['remove', false]]) {
			for (const id of change[list] ?? []) {
				const role = guild.roles.cache.get(id);
				const field = `creatorRoles.${event}.${list}`;
				const problem = creatorRoleProblem(guild, role, { adding });
				if (problem) throw new ValidationError(field, `<@&${id}> ${problem}`);
				const canManage = owner || (
					admin.permissions.has(Flags.ManageRoles) &&
					admin.roles.highest.comparePositionTo(role) > 0
				);
				if (!canManage) throw new ValidationError(field, `you can't manage <@&${id}> yourself`);
			}
		}
	}
}

/**
 * Give and take the creator's roles for an event. Roles that are no longer safe or manageable are skipped.
 * Failures are logged, never thrown.
 * @param {import('client')} client
 * @param {import('discord.js').Guild} guild
 * @param {object} category
 * @param {string} userId the creator
 * @param {'open'|'claim'|'close'} event
 * @returns {Promise<{ added: string[], removed: string[] }>}
 */
async function applyCreatorRoles(client, guild, category, userId, event) {
	const change = category?.creatorRoles?.[event];
	const result = {
		added: [],
		removed: [],
	};
	if (!change || (!change.add?.length && !change.remove?.length)) return result;
	try {
		const member = guild.members.cache.get(userId) ?? await guild.members.fetch(userId).catch(() => null);
		if (!member) return result; // the creator left
		const usable = (ids, adding) => ids.filter(id => {
			const problem = creatorRoleProblem(guild, guild.roles.cache.get(id), { adding });
			if (problem) client.log.warn(`Skipping creator role ${id} in category ${category.id}: it ${problem}`);
			return !problem;
		});
		const add = usable(change.add ?? [], true).filter(id => !member.roles.cache.has(id));
		const remove = usable(change.remove ?? [], false).filter(id => member.roles.cache.has(id));
		const reason = `Ticket ${event === 'open' ? 'opened' : event === 'claim' ? 'claimed' : 'closed'} (category ${category.name})`;
		if (add.length) {
			await member.roles.add(add, reason);
			result.added = add;
		}
		if (remove.length) {
			await member.roles.remove(remove, reason);
			result.removed = remove;
		}
	} catch (error) {
		client.log.warn(`Failed to change the roles of ${userId} for "${event}" in category ${category.id}`, error);
	}
	return result;
}

/**
 * Fill a lifecycle message. Everything the opening message supports, plus `{claimer}`, `{reason}` and `{age}`.
 * @param {string} template
 * @param {object} values
 * @param {object} values.category
 * @param {import('discord.js').GuildMember | null} [values.creator]
 * @param {object} values.ticket
 * @param {string | null} [values.claimer] already anonymised where needed
 * @param {string | null} [values.reason]
 * @param {Date | number} [values.now]
 * @returns {string}
 */
function formatLifecycleMessage(template, {
	category, claimer, creator, now = Date.now(), reason, ticket,
}) {
	const age = ticket?.createdAt ? ms(Math.max(0, Number(now) - new Date(ticket.createdAt).getTime()), { long: true }) : null;
	const filled = formatOpeningMessage(template, {
		category,
		creator,
		number: ticket?.number,
		topic: ticket?.topic,
	});
	const extra = {
		age,
		claimer,
		reason,
	};
	return filled.replace(/{+\s?(age|claimer|reason)\s?}+/gi, (match, key) => extra[key.toLowerCase()] ?? '').trim();
}

/**
 * Create a private thread for staff in a ticket. Mentioning the staff roles adds the staff who can see the channel;
 * the creator can't see private threads they weren't added to.
 * @param {import('discord.js').TextChannel} channel
 * @param {object} category
 * @param {number} number
 * @param {(key: string, args?: object) => string} getMessage
 * @returns {Promise<import('discord.js').ThreadChannel | null>}
 */
async function createStaffThread(channel, category, number, getMessage) {
	try {
		const thread = await channel.threads.create({
			autoArchiveDuration: 10080,
			invitable: false,
			name: getMessage('ticket.staff_thread.name', { number }).slice(0, 100),
			reason: 'Private staff thread',
			type: ChannelType.PrivateThread,
		});
		const roles = category.staffRoles ?? [];
		await thread.send({
			allowedMentions: { roles },
			content: [getMessage('ticket.staff_thread.message'), roles.map(id => `<@&${id}>`).join(' ')].filter(Boolean).join('\n'),
		});
		return thread;
	} catch (error) {
		channel.client.log.warn(`Failed to create the staff thread in ticket ${channel.id}`, error);
		return null;
	}
}

/**
 * The number of a member's closed tickets in a category whose channels are still there.
 * @param {import('client')} client
 * @param {number} categoryId
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function countKeptClosedTickets(client, categoryId, userId) {
	const tickets = await client.prisma.ticket.findMany({
		orderBy: { closedAt: 'desc' },
		select: { id: true },
		take: 200,
		where: {
			categoryId,
			createdById: userId,
			open: false,
		},
	});
	return tickets.filter(ticket => client.channels.cache.has(ticket.id)).length;
}

module.exports = {
	DANGEROUS_PERMISSIONS,
	applyCreatorRoles,
	checkCreatorRoles,
	countKeptClosedTickets,
	createStaffThread,
	creatorRoleProblem,
	formatLifecycleMessage,
};
