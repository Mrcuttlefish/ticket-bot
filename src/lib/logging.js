const {
	cleanCodeBlockContent,
	EmbedBuilder,
} = require('discord.js');
const { diff: getDiff } = require('object-diffy');
const ShortUniqueId = require('short-unique-id');

const uid = new ShortUniqueId();

const getSUID = () => uid.stamp(10);

const uuidRegex = /[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}/g;

const exists = thing => typeof thing === 'string' ? thing.length > 0 : thing !== null && thing !== undefined;

const arrToObj = obj => {
	for (const key in obj) {
		if (obj[key] instanceof Array && obj[key][0]?.id) {
			const temp = {};
			obj[key].forEach(v => (temp[v.id] = v));
			obj[key] = temp;
		}
	}
	return obj;
};

function makeDiff({
	original, updated,
}) {
	const diff = getDiff(arrToObj(original), arrToObj(updated));
	const fields = [];
	for (const key in diff) {
		if (key === 'createdAt') continue; // object-diffy doesn't like dates
		const from = exists(diff[key].from) ? `- ${String(diff[key].from).replace(/\n/g, '\\n')}\n` : '';
		const to = exists(diff[key].to) ? `+ ${String(diff[key].to).replace(/\n/g, '\\n')}\n` : '';
		fields.push({
			inline: true,
			name: key.replace(uuidRegex, $1 => $1.split('-')[0]),
			value: `\`\`\`diff\n${cleanCodeBlockContent(from + to)}\n\`\`\``,
		});
	}
	return fields;
}

/**
 * @param {import("client")} client
 * @param {string} guildId
 * @returns {import("discord.js").TextChannel?}
*/
async function getLogChannel(client, guildId) {
	const { logChannel: channelId } = await client.prisma.guild.findUnique({
		select: { logChannel: true },
		where: { id: guildId },
	});
	return guildChannel(client, guildId, channelId);
}

/**
 * Get a channel by ID, but only if it belongs to the given guild.
 * Prevents one guild's logs being sent to a channel in another guild.
 * @param {import("client")} client
 * @param {string} guildId
 * @param {string} channelId
 * @returns {import("discord.js").GuildTextBasedChannel?}
 */
function guildChannel(client, guildId, channelId) {
	if (!channelId) return null;
	const channel = client.channels.cache.get(channelId);
	if (!channel || channel.guildId !== guildId) return null;
	return channel;
}

/**
 * Whether an event should be sent to the log channel. Servers can leave events out (`logExclude`);
 * everything is still written to the bot's own log.
 * @param {string[] | null | undefined} logExclude
 * @param {string} event e.g. "ticket.close", "message.delete" or "admin"
 * @returns {boolean}
 */
function isLogged(logExclude, event) {
	if (!Array.isArray(logExclude)) return true;
	return !logExclude.includes(event) && !logExclude.includes(event.split('.')[0]);
}

/**
 * @param {import("client")} client
 * @param {string} guildId
 * @param {string} event
 * @returns {Promise<boolean>}
 */
async function shouldLog(client, guildId, event) {
	const settings = await client.prisma.guild.findUnique({
		select: { logExclude: true },
		where: { id: guildId },
	});
	return isLogged(settings?.logExclude, event);
}

/**
 * @param {import("client")} client
 * @param {object} details
 * @param {string} details.guildId
 * @param {string} details.userId
 * @param {string} details.action
*/
async function logAdminEvent(client, {
	guildId, userId, action, target, diff,
}) {
	const settings = await client.prisma.guild.findUnique({
		select: {
			footer: true,
			locale: true,
			logChannel: true,
			logExclude: true,
		},
		where: { id: guildId },
	});
	/** @type {import("discord.js").Guild} */
	const guild = client.guilds.cache.get(guildId);
	const member = await guild.members.fetch(userId);
	client.log.info.settings(`${member.user.tag} ${action}d ${target.type} ${target.id}`);
	if (!settings.logChannel || !isLogged(settings.logExclude, 'admin')) return;
	const colour = action === 'create'
		? 'Green' : action === 'update'
			? 'Orange' : action === 'delete'
				? 'Red' : 'Default';
	const getMessage = client.i18n.getLocale(settings.locale);
	const i18nOptions = {
		user: `<@${member.user.id}>`,
		verb: getMessage(`log.admin.verb.${action}`),
	};
	const channel = guildChannel(client, guildId, settings.logChannel);
	if (!channel) return;
	const embeds = [
		new EmbedBuilder()
			.setColor(colour)
			.setAuthor({
				iconURL: member.displayAvatarURL(),
				name: member.displayName,
			})
			.setTitle(getMessage('log.admin.title.joined', {
				...i18nOptions,
				targetType: getMessage(`log.admin.title.target.${target.type}`),
				verb: getMessage(`log.admin.verb.${action}`),
			}))
			.setDescription(getMessage('log.admin.description.joined', {
				...i18nOptions,
				targetType: getMessage(`log.admin.description.target.${target.type}`),
				verb: getMessage(`log.admin.verb.${action}`),
			}))
			.addFields([
				{
					name: getMessage(`log.admin.title.target.${target.type}`),
					value: target.name ? `${target.name} (\`${target.id}\`)` : target.id,
				},
			]),
	];

	if (diff?.original && Object.entries(makeDiff(diff)).length) {
		embeds.push(
			new EmbedBuilder()
				.setColor(colour)
				.setTitle(getMessage('log.admin.changes'))
				.setFields(makeDiff(diff)),
		);
	}

	return await channel.send({ embeds });
}

/**
 * @param {import("client")} client
 * @param {object} details
 * @param {string} details.guildId
 * @param {string} details.userId
 * @param {string} details.action
*/
async function logTicketEvent(client, {
	userId, action, target, diff, payload,
}) {
	const ticket = await client.tickets.getTicket(target.id);
	if (!ticket) return;
	/** @type {import("discord.js").Guild} */
	const guild = client.guilds.cache.get(ticket.guild.id);
	// the user may have left the server (e.g. staff who closed a ticket); that mustn't stop the event being logged
	const member = await guild?.members.fetch(userId).catch(() => null) ?? {
		displayAvatarURL: () => null,
		displayName: userId,
		user: {
			id: userId,
			tag: userId,
		},
	};
	client.log.info.tickets(`${member.user.tag} ${client.i18n.getMessage('en-GB', `log.ticket.verb.${action}`)} ticket ${target.id}`);
	if (!ticket.guild.logChannel) return;
	if (!(await shouldLog(client, ticket.guild.id, `ticket.${action}`))) return;
	// in anonymous tickets, the log channel shows "Staff"; the real name is only in the bot's own log (above)
	const anonymous = ticket.category?.anonymous && userId !== ticket.createdById && userId !== client.user.id;
	const channel = guildChannel(client, ticket.guild.id, ticket.guild.logChannel);
	if (!channel) return;
	const colour = action === 'create'
		? 'Aqua' : action === 'close'
			? 'DarkAqua' : action === 'update'
				? 'Purple' : action === 'claim'
					? 'LuminousVividPink' : action === 'unclaim'
						? 'DarkVividPink' : action === 'reopen'
							? 'Green' : action === 'delete'
								? 'DarkRed' : 'Default';
	const getMessage = client.i18n.getLocale(ticket.guild.locale);
	const staffName = getMessage('ticket.anonymous.staff');
	const i18nOptions = {
		user: anonymous ? staffName : `<@${member.user.id}>`,
		verb: getMessage(`log.ticket.verb.${action}`),
	};
	const embeds = [
		new EmbedBuilder()
			.setColor(colour)
			.setAuthor(anonymous
				? { name: staffName }
				: {
					iconURL: member.displayAvatarURL(),
					name: member.displayName,
				})
			.setTitle(getMessage('log.ticket.title', i18nOptions))
			.setDescription(getMessage('log.ticket.description', i18nOptions))
			.addFields([
				{
					name: getMessage('log.ticket.ticket'),
					value: target.name ? `${target.name} (\`${target.id}\`)` : target.id,
				},
				...payload?.fields ?? [],
			]),
	];

	if (diff?.original && Object.entries(makeDiff(diff)).length) {
		embeds.push(
			new EmbedBuilder()
				.setColor(colour)
				.setTitle(getMessage('log.admin.changes'))
				.setFields(makeDiff(diff)),
		);
	}

	return await channel.send({
		components: payload?.components ?? [],
		embeds,
	});
}

/**
 * @param {import("client")} client
 * @param {object} details
 * @param {string} details.action
 * @param {import("discord.js").Message} details.target
 * @param {import("@prisma/client").Ticket & {guild: import("@prisma/client").Guild}} details.ticket
*/
async function logMessageEvent(client, {
	action, executor, target, ticket, diff,
}) {
	if (!ticket) return;
	if (executor === undefined) executor = target.member;
	client.log.info.tickets(`${executor?.user.tag || 'Unknown'} ${client.i18n.getMessage('en-GB', `log.message.verb.${action}`)} message ${target.id}`);
	if (!ticket.guild.logChannel) return;
	if (!(await shouldLog(client, ticket.guild.id, `message.${action}`))) return;
	const colour = action === 'update'
		? 'Purple' : action === 'delete'
			? 'DarkPurple' : 'Default';
	const getMessage = client.i18n.getLocale(ticket.guild.locale);
	// in anonymous tickets, staff are "Staff" in the log channel; the real name is only in the bot's own log (above)
	const hide = id => Boolean(ticket.category?.anonymous && id && id !== ticket.createdById && id !== client.user.id);
	const staffName = getMessage('ticket.anonymous.staff');
	const i18nOptions = {
		user: hide(executor?.user.id) ? staffName : `<@${executor?.user.id}>`,
		verb: getMessage(`log.message.verb.${action}`),
	};
	const channel = guildChannel(client, ticket.guild.id, ticket.guild.logChannel);
	if (!channel) return;
	const embeds = [
		new EmbedBuilder()
			.setColor(colour)
			.setAuthor(hide(target.member?.id ?? target.author?.id)
				? { name: staffName }
				: {
					iconURL: target.member?.displayAvatarURL() || 'https://discord.com/assets/1f0bfc0865d324c2587920a7d80c609b.png',
					name: target.member?.displayName || 'Unknown',
				})
			.setTitle(getMessage('log.message.title', i18nOptions))
			.setDescription(getMessage('log.message.description', i18nOptions))
			.addFields([
				{
					name: getMessage('log.message.message'),
					value: `[\`${target.id}\`](${target.url})`,
				},
			]),
	];

	if (diff?.original && Object.entries(makeDiff(diff)).length) {
		embeds.push(
			new EmbedBuilder()
				.setColor(colour)
				.setTitle(getMessage('log.admin.changes'))
				.setFields(makeDiff(diff)),
		);
	}

	return await channel.send({ embeds });
}

module.exports = {
	getLogChannel,
	getSUID,
	guildChannel,
	isLogged,
	logAdminEvent,
	logMessageEvent,
	logTicketEvent,
};
