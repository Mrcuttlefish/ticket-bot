/**
 * The archive portal API (upstream #337): ticket lists, transcripts, replies and closing from the web.
 * Routes are in src/routes/api/guilds/[guild]/tickets. The agreed response shapes are in the PR description.
 *
 * Who can see what (the same people who can see the ticket in Discord or get its transcript with /transcript):
 * - server managers (Manage Server) and bot operators can see every ticket in the guild
 * - staff can see tickets in the categories they're staff for, except open tickets that someone else claimed in a
 *   category that hides claimed tickets
 * - anyone else can only see tickets they created
 * - in anonymous categories (anonymous.js), staff authors are shown as a fixed "Staff" author to everyone, staff
 *   included; the real author is only in the database (and the bot's log files)
 */

const { EventEmitter } = require('node:events');
const { PermissionsBitField } = require('discord.js');
const { pools } = require('../threads');

const { crypto } = pools;

/** the author shown instead of staff in anonymous tickets */
const STAFF_AUTHOR = Object.freeze({
	avatar: null,
	bot: false,
	displayName: 'Staff',
	id: '0',
	roleColour: null,
	username: 'Staff',
});

const decrypt = value => (value ? crypto.queue(w => w.decrypt(value)) : value);

/**
 * Events for the live stream (`GET .../events`). Each event has `ticketId`, so listeners filter by ticket.
 * - `message` `{ ticketId, messageId }` after a message is archived
 * - `message-deleted` `{ ticketId, messageId }`
 * - `ticket-closed` `{ ticketId }`
 * @param {import('client')} client
 * @returns {EventEmitter}
 */
function getPortalEvents(client) {
	if (!client.portalEvents) {
		client.portalEvents = new EventEmitter();
		client.portalEvents.setMaxListeners(0); // one listener per open browser tab
	}
	return client.portalEvents;
}

/**
 * @typedef {object} Viewer
 * @property {import('discord.js').Guild} guild
 * @property {string} userId
 * @property {boolean} admin can see every ticket in the guild
 * @property {number[]} staffCategories the categories the viewer is staff for (empty for admins, who are staff for all)
 * @property {boolean} staff whether the viewer is staff for any category
 */

/**
 * @param {import('client')} client
 * @param {string} guildId
 * @param {string} userId
 * @returns {Promise<Viewer>}
 */
async function getViewer(client, guildId, userId) {
	const guild = client.guilds.cache.get(guildId);
	const member = guild.members.cache.get(userId) ?? await guild.members.fetch(userId).catch(() => null);
	const admin = client.supers.includes(userId) ||
		Boolean(member?.permissions.has(PermissionsBitField.Flags.ManageGuild));
	let staffCategories = [];
	if (member && !admin) {
		const categories = await client.prisma.category.findMany({
			select: {
				id: true,
				staffRoles: true,
			},
			where: { guildId: guild.id },
		});
		staffCategories = categories
			.filter(category => (category.staffRoles ?? []).some(role => member.roles.cache.has(role)))
			.map(category => category.id);
	}
	return {
		admin,
		guild,
		staff: admin || staffCategories.length > 0,
		staffCategories,
		userId,
	};
}

/**
 * Whether the viewer is staff for this ticket: what Discord shows them, not just whether they're staff somewhere.
 * @param {Viewer} viewer
 * @param {object} ticket a ticket row with `category`
 * @returns {boolean}
 */
function isTicketStaff(viewer, ticket) {
	if (viewer.admin) return true;
	if (!viewer.staffCategories.includes(ticket.categoryId)) return false;
	// claimed tickets are hidden from the rest of the staff in Discord while they're open
	if (ticket.open && ticket.category?.claimHide && ticket.claimedById && ticket.claimedById !== viewer.userId) return false;
	return true;
}

/**
 * A Prisma `where` for the tickets the viewer may see (combine it with the guild's ID).
 * @param {Viewer} viewer
 * @returns {object}
 */
function viewableWhere(viewer) {
	if (viewer.admin) return {};
	return {
		OR: [
			{ createdById: viewer.userId },
			{
				categoryId: { in: viewer.staffCategories },
				NOT: {
					AND: [
						{ open: true },
						{ category: { claimHide: true } },
						{ claimedById: { not: null } },
						{ claimedById: { not: viewer.userId } },
					],
				},
			},
		],
	};
}

/**
 * Find a ticket in a guild that the viewer may see, or send an error.
 * Tickets the viewer can't see get a 404, the same as tickets that don't exist.
 * @param {import('fastify').FastifyRequest} req
 * @param {import('fastify').FastifyReply} res
 * @param {object} [include] Prisma `include`
 * @returns {Promise<{ ticket: object, guild: import('discord.js').Guild, staff: boolean } | null>} `staff`: for this ticket
 */
async function findViewableTicket(req, res, include = {}) {
	/** @type {import('client')} */
	const client = req.routeOptions.config.client;
	const viewer = await getViewer(client, req.params.guild, req.user.id);
	const { guild } = viewer;
	const ticket = /^\d{17,20}$/.test(req.params.ticket)
		? await client.prisma.ticket.findFirst({
			include: {
				category: true,
				...include,
			},
			where: {
				guildId: guild.id,
				id: req.params.ticket,
			},
		})
		: null;
	const staff = Boolean(ticket) && isTicketStaff(viewer, ticket);
	if (!ticket || !canView(ticket, req.user.id, staff)) {
		res.code(404).send({
			error: 'Not Found',
			message: 'The requested resource could not be found.',
			statusCode: 404,
		});
		return null;
	}
	return {
		guild,
		staff,
		ticket,
	};
}

/**
 * @param {object} ticket a ticket row
 * @param {string} userId
 * @param {boolean} staff
 * @returns {boolean}
 */
const canView = (ticket, userId, staff) => staff || ticket.createdById === userId;

/**
 * @param {object} ticket a ticket row
 * @param {string} userId
 * @param {boolean} staff
 * @returns {{ canClose: boolean, canReply: boolean, isStaff: boolean }}
 */
function getPermissions(ticket, userId, staff) {
	const involved = staff || ticket.createdById === userId;
	return {
		canClose: involved && ticket.open,
		canReply: involved && ticket.open,
		isStaff: staff,
	};
}

/**
 * @param {object} category
 * @returns {{ emoji: string, id: number, name: string } | null}
 */
const serializeCategory = category => (category
	? {
		emoji: category.emoji,
		id: category.id,
		name: category.name,
	}
	: null);

/**
 * @param {object} ticket a ticket row with `category`
 * @returns {Promise<object>} in anonymous tickets, staff are "0"
 */
async function serializeTicket(ticket) {
	const hide = id => (id && ticket.category?.anonymous && id !== ticket.createdById ? STAFF_AUTHOR.id : id);
	return {
		category: serializeCategory(ticket.category),
		claimedById: hide(ticket.claimedById) ?? null,
		closedById: hide(ticket.closedById) ?? null,
		closedAt: ticket.closedAt,
		createdAt: ticket.createdAt,
		createdById: ticket.createdById,
		id: ticket.id,
		messageCount: ticket._count?.archivedMessages ?? ticket.messageCount ?? 0,
		number: ticket.number,
		open: ticket.open,
		topic: ticket.topic ? await decrypt(ticket.topic) : null,
	};
}

/**
 * A `users` map for a list of tickets, from Discord's cache (the users may not be archived yet for open tickets).
 * @param {import('discord.js').Guild} guild
 * @param {string[]} ids
 * @returns {Promise<Record<string, { avatar: string | null, displayName: string, username: string }>>}
 */
async function getUsers(guild, ids) {
	const users = {};
	for (const id of new Set(ids.filter(Boolean))) {
		if (id === STAFF_AUTHOR.id) {
			users[id] = {
				avatar: null,
				displayName: STAFF_AUTHOR.displayName,
				username: STAFF_AUTHOR.username,
			};
			continue;
		}
		const member = guild.members.cache.get(id);
		const user = member?.user ?? guild.client.users?.cache.get(id) ?? await guild.client.users?.fetch(id).catch(() => null);
		users[id] = user
			? {
				avatar: member?.displayAvatarURL?.() ?? user.displayAvatarURL?.() ?? null,
				displayName: member?.displayName ?? user.globalName ?? user.username,
				username: user.username,
			}
			: {
				avatar: null,
				displayName: 'Unknown user',
				username: 'unknown',
			};
	}
	return users;
}

/**
 * Discord's attachment URLs expire (the `ex` query parameter, in hex seconds).
 * @param {string} url
 * @param {number} [now]
 * @returns {boolean}
 */
function isExpired(url, now = Date.now()) {
	try {
		const ex = new URL(url).searchParams.get('ex');
		if (!ex) return false;
		return parseInt(ex, 16) * 1000 <= now + 60_000;
	} catch {
		return false;
	}
}

/**
 * Get fresh URLs for expired attachments from Discord. If that fails, the attachments are marked as expired.
 * @param {import('client')} client
 * @param {{ url: string, expired?: boolean }[]} attachments
 */
async function refreshAttachments(client, attachments) {
	const stale = attachments.filter(a => isExpired(a.url));
	if (stale.length === 0) return;
	let refreshed = [];
	try {
		// up to 50 URLs per request
		for (let i = 0; i < stale.length; i += 50) {
			const { refreshed_urls: urls } = await client.rest.post('/attachments/refresh-urls', { body: { attachment_urls: stale.slice(i, i + 50).map(a => a.url) } });
			refreshed = refreshed.concat(urls);
		}
	} catch (error) {
		client.log.verbose.http?.('Failed to refresh attachment URLs', error);
	}
	const fresh = new Map(refreshed.map(r => [r.original, r.refreshed]));
	for (const attachment of stale) {
		if (fresh.has(attachment.url)) attachment.url = fresh.get(attachment.url);
		else attachment.expired = true;
	}
}

/**
 * Turn archived messages into the API's message shape.
 * @param {import('client')} client
 * @param {object} ticket a ticket row with `category`, `archivedUsers` and `archivedRoles`
 * @param {object[]} messages archived message rows
 * @returns {Promise<object[]>}
 */
async function serializeMessages(client, ticket, messages) {
	const roles = new Map(ticket.archivedRoles.map(r => [r.roleId, r]));
	const users = new Map(await Promise.all(ticket.archivedUsers.map(async u => [u.userId, {
		avatar: u.avatar,
		bot: u.bot,
		displayName: u.displayName ? await decrypt(u.displayName) : null,
		id: u.userId,
		roleColour: roles.get(u.roleId)?.colour ? `#${roles.get(u.roleId).colour}` : null,
		username: await decrypt(u.username),
	}])));
	const hideStaff = ticket.category?.anonymous;

	const serialized = await Promise.all(messages.map(async message => {
		let content = {};
		try {
			content = JSON.parse(await decrypt(message.content));
		} catch {
			// unreadable (e.g. encrypted with another key)
		}
		let author = users.get(message.authorId) ?? {
			avatar: null,
			bot: false,
			displayName: null,
			id: message.authorId,
			roleColour: null,
			username: 'unknown',
		};
		if (hideStaff && author.id !== ticket.createdById && !author.bot) author = STAFF_AUTHOR;
		return {
			attachments: (content.attachments ?? []).map(a => ({
				contentType: a.contentType ?? null,
				name: a.name,
				size: a.size ?? null,
				url: a.url,
			})),
			author,
			content: content.content ?? '',
			createdAt: message.createdAt,
			deleted: message.deleted,
			editedAt: content.editedAt ?? null,
			embeds: content.embeds ?? [],
			id: message.id,
			viaWeb: Boolean(content.viaWeb),
		};
	}));
	await refreshAttachments(client, serialized.flatMap(m => m.attachments));
	return serialized;
}

/**
 * A per-user sliding window rate limit for replies.
 */
class RateLimit {
	/**
	 * @param {number} limit
	 * @param {number} window in ms
	 */
	constructor(limit, window) {
		this.limit = limit;
		this.window = window;
		/** @type {Map<string, number[]>} */
		this.hits = new Map();
	}

	/**
	 * @param {string} key
	 * @param {number} [now]
	 * @returns {boolean} whether the request is allowed (and counted)
	 */
	take(key, now = Date.now()) {
		const recent = (this.hits.get(key) ?? []).filter(t => t > now - this.window);
		if (recent.length >= this.limit) {
			this.hits.set(key, recent);
			return false;
		}
		recent.push(now);
		this.hits.set(key, recent);
		if (this.hits.size > 10_000) {
			for (const [k, times] of this.hits) if (!times.some(t => t > now - this.window)) this.hits.delete(k);
		}
		return true;
	}
}

/**
 * Cookie-authenticated requests that change something must come from the portal (CSRF protection).
 * Requests that use an `Authorization` header (API keys) can't be forged by another site, so they're allowed.
 * @param {import('fastify').FastifyRequest} req
 * @returns {string|null} an error message, or null if the request is allowed
 */
function checkWriteRequest(req) {
	if (!String(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) return 'Content-Type must be application/json.';
	if (req.headers.authorization) return null;
	let expected;
	try {
		expected = new URL(process.env.HTTP_EXTERNAL).origin;
	} catch {
		return 'HTTP_EXTERNAL is not set, so cookie-authenticated requests can\'t be checked.';
	}
	if (req.headers.origin !== expected) return 'The request must come from the portal.';
	return null;
}

module.exports = {
	RateLimit,
	STAFF_AUTHOR,
	canView,
	checkWriteRequest,
	findViewableTicket,
	getPermissions,
	getPortalEvents,
	getUsers,
	getViewer,
	isExpired,
	isTicketStaff,
	refreshAttachments,
	serializeCategory,
	serializeMessages,
	serializeTicket,
	viewableWhere,
};
