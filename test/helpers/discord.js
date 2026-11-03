/**
 * Small fakes of the discord.js objects the bot uses. They record what the bot sends so tests can check it,
 * and only implement what the code under test needs. Snowflakes are generated so IDs pass validation.
 */

const {
	ChannelType,
	Collection,
	MessageFlagsBitField,
	PermissionsBitField,
} = require('discord.js');

let next = 100000000000000000n;
const snowflake = () => String(++next);

function makeRole(guild, {
	id = snowflake(), name = 'role',
} = {}) {
	return {
		colour: 0,
		createdAt: new Date(),
		hexColor: '#000000',
		guild,
		id,
		name,
		toString: () => `<@&${id}>`,
	};
}

function makeUser({
	id = snowflake(), username = 'user', bot = false,
} = {}) {
	return {
		avatar: null,
		bot,
		discriminator: '0',
		displayAvatarURL: () => `https://cdn.discordapp.com/embed/avatars/0.png#${id}`,
		globalName: username,
		id,
		tag: username,
		toString: () => `<@${id}>`,
		username,
	};
}

function makeMember(guild, {
	user = makeUser(), roles = [], admin = false, timedOut = false, status = 'online',
} = {}) {
	const member = {
		displayAvatarURL: () => user.displayAvatarURL(),
		displayName: user.globalName,
		dms: [],
		guild,
		id: user.id,
		isCommunicationDisabled: () => timedOut,
		permissions: new PermissionsBitField(admin ? PermissionsBitField.Flags.ManageGuild : 0n),
		presence: { status },
		roles: {
			cache: new Collection(roles.map(id => [id, guild.roles.cache.get(id) ?? makeRole(guild, { id })])),
			hoist: null,
		},
		send: async payload => {
			member.dms.push(payload);
			return {};
		},
		toString: () => `<@${user.id}>`,
		user,
	};
	guild.members.cache.set(member.id, member);
	return member;
}

function makeMessage(channel, {
	id = snowflake(), author = channel.client.user, content = '', payload = {},
} = {}) {
	const message = {
		...payload,
		reply: async data => channel.send(data),
		attachments: new Collection(),
		author,
		channel,
		channelId: channel.id,
		cleanContent: content,
		components: payload.components ?? [],
		content: payload.content ?? content,
		createdAt: new Date(),
		createdTimestamp: Date.now(),
		deleted: false,
		delete: async () => {
			message.deleted = true;
			channel.messages.cache.delete(message.id);
			return message;
		},
		edit: async data => {
			Object.assign(message, data);
			channel.edits.push({
				data,
				id: message.id,
			});
			return message;
		},
		embeds: payload.embeds ?? [],
		flags: new MessageFlagsBitField(payload.flags ?? 0),
		guild: channel.guild,
		id,
		member: channel.guild.members.cache.get(author.id) ?? null,
		mentions: {
			channels: new Collection(),
			members: new Collection(),
			roles: new Collection(),
			users: new Collection(),
		},
		pin: async () => {
			message.pinned = true;
			return message;
		},
		pinned: false,
		react: async () => {},
		reference: null,
		stickers: new Collection(),
		system: false,
		url: `https://discord.com/channels/${channel.guild.id}/${channel.id}/${id}`,
	};
	channel.messages.cache.set(message.id, message);
	return message;
}

function makeTextChannel(guild, {
	id = snowflake(), name = 'channel', parentId = null, topic = null,
} = {}) {
	const channel = {
		client: guild.client,
		createdAt: new Date(),
		deletable: true,
		delete: async reason => {
			channel.deleted = true;
			channel.deleteReason = reason;
			guild.channels.cache.delete(channel.id);
			guild.client.channels.cache.delete(channel.id);
		},
		deleted: false,
		edit: async data => Object.assign(channel, data),
		edits: [],
		guild,
		guildId: guild.id,
		id,
		isTextBased: () => true,
		members: new Collection(),
		messages: {
			cache: new Collection(),
			delete: async messageId => channel.messages.cache.get(messageId?.id ?? messageId)?.delete(),
			fetch: async options => {
				if (typeof options === 'string') {
					const found = channel.messages.cache.get(options);
					if (!found) throw new Error('Unknown Message');
					return found;
				}
				return new Collection([...channel.messages.cache.entries()].reverse().slice(0, options?.limit ?? 50));
			},
			fetchPinned: async () => channel.messages.cache.filter(m => m.pinned),
		},
		name,
		parentId,
		permissionOverwrites: {
			cache: new Collection(),
			delete: async targetId => channel.permissionOverwrites.cache.delete(targetId),
			edit: async (targetId, options) => channel.permissionOverwrites.cache.set(targetId?.id ?? targetId, options),
			set: async overwrites => {
				channel.permissionOverwrites.cache = new Collection(overwrites.map(o => [o.id, o]));
			},
		},
		send: async payload => {
			if (typeof payload === 'string') payload = { content: payload };
			channel.sent.push(payload);
			return makeMessage(channel, { payload });
		},
		sent: [],
		setName: async value => (channel.name = value),
		setParent: async value => (channel.parentId = value?.id ?? value),
		setTopic: async value => (channel.topic = value),
		toString: () => `<#${id}>`,
		topic,
		type: ChannelType.GuildText,
	};
	guild.channels.cache.set(channel.id, channel);
	guild.client.channels.cache.set(channel.id, channel);
	if (parentId) guild.channels.cache.get(parentId)?.children.cache.set(channel.id, channel);
	return channel;
}

function makeCategoryChannel(guild, {
	id = snowflake(), name = 'Tickets', children = 0,
} = {}) {
	const category = {
		children: { cache: new Collection() },
		client: guild.client,
		guild,
		guildId: guild.id,
		id,
		name,
		type: ChannelType.GuildCategory,
	};
	guild.channels.cache.set(category.id, category);
	guild.client.channels.cache.set(category.id, category);
	for (let i = 0; i < children; i++) category.children.cache.set(snowflake(), {});
	return category;
}

function makeGuild(client, {
	id = snowflake(), name = 'Test server',
} = {}) {
	const guild = {
		channels: {
			cache: new Collection(),
			create: async ({
				name: channelName, parent, permissionOverwrites = [], topic,
			}) => {
				const channel = makeTextChannel(guild, {
					name: channelName,
					parentId: parent?.id ?? parent ?? null,
					topic,
				});
				channel.permissionOverwrites.cache = new Collection(permissionOverwrites.map(o => [o.id, o]));
				guild.created.push(channel);
				return channel;
			},
		},
		client,
		created: [],
		iconURL: () => null,
		id,
		members: {
			cache: new Collection(),
			fetch: async userId => {
				if (userId === undefined) return guild.members.cache;
				const member = guild.members.cache.get(userId?.id ?? userId);
				if (!member) throw new Error('Unknown Member');
				return member;
			},
		},
		name,
		preferredLocale: 'en-GB',
		roles: { cache: new Collection() },
	};
	guild.roles.everyone = makeRole(guild, {
		id,
		name: '@everyone',
	});
	guild.roles.cache.set(id, guild.roles.everyone);
	client.guilds.cache.set(guild.id, guild);
	if (client.user) makeMember(guild, { user: client.user }); // the bot is a member of its servers
	return guild;
}

/**
 * A fake interaction that records every response.
 */
function makeInteraction({
	member, channel = null, clicks = [], customId = null, fields = {}, options = {}, type = 'button', message = null,
}) {
	const responses = [];
	const buttons = [];
	const record = kind => async data => {
		responses.push({
			data,
			kind,
		});
		if (kind === 'deferReply' || kind === 'deferUpdate') interaction.deferred = true;
		if (kind === 'reply' || kind === 'update') interaction.replied = true;
		const reply = {
			...data,
			// `clicks` are the customIds (objects) of buttons the user presses on replies, in order; none means a timeout
			awaitMessageComponent: async () => {
				if (clicks.length === 0) throw new Error('Collector received no interactions before ending with reason: time');
				const button = makeInteraction({
					channel,
					customId: JSON.stringify(clicks.shift()),
					member,
				});
				buttons.push(button);
				return button;
			},
			delete: async () => {},
			edit: async edited => Object.assign(reply, edited),
			id: snowflake(),
		};
		return reply;
	};
	const interaction = {
		buttons,
		channel,
		channelId: channel?.id,
		client: member.guild.client,
		customId,
		deferReply: record('deferReply'),
		deferUpdate: record('deferUpdate'),
		deferred: false,
		editReply: record('editReply'),
		// text answers are strings, menu answers are arrays of option values
		fields: {
			getStringSelectValues: name => {
				if (!Array.isArray(fields[name])) throw new Error(`No select menu "${name}"`);
				return fields[name];
			},
			getTextInputValue: name => (Array.isArray(fields[name]) ? '' : fields[name] ?? ''),
		},
		followUp: record('followUp'),
		guild: member.guild,
		guildId: member.guild.id,
		isButton: () => type === 'button',
		isChatInputCommand: () => type === 'command',
		isModalSubmit: () => type === 'modal',
		isStringSelectMenu: () => type === 'menu',
		member,
		message,
		options: {
			getChannel: name => options[name] ?? null,
			getMember: name => options[name] ?? null,
			getRole: name => options[name] ?? null,
			getString: name => options[name] ?? null,
			getUser: name => options[name] ?? null,
		},
		replied: false,
		reply: record('reply'),
		responses,
		showModal: record('showModal'),
		update: record('update'),
		user: member.user,
	};
	return interaction;
}

/**
 * Run a discord.js Framework component (listener, button, command, modal) without registering it
 * @param {Function} Component the class
 * @param {object} client
 * @param {...any} args the arguments to `run`
 */
const runComponent = (Component, client, ...args) => Component.prototype.run.call({ client }, ...args);

/** The text of every embed title and description in a response or message payload */
const embedText = payload => (payload?.embeds ?? [])
	.map(e => {
		const data = e.data ?? e;
		return [data.title, data.description].filter(Boolean).join('\n');
	})
	.join('\n');

module.exports = {
	embedText,
	makeCategoryChannel,
	makeGuild,
	makeInteraction,
	makeMember,
	makeMessage,
	makeRole,
	makeTextChannel,
	makeUser,
	runComponent,
	snowflake,
};
