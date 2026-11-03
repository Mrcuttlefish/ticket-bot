const { logAdminEvent } = require('../../../../../lib/logging.js');
const {
	ChannelType,
	Colors,
} = require('discord.js');
const {
	ValidationError,
	sanitize,
	schemas,
} = require('../../../../../lib/validation');
const {
	maskWebhookSecret,
	prepareWebhookSecret,
} = require('../../../../../lib/webhook-secret');


module.exports.get = fastify => ({
	handler: async req => {
		/** @type {import('client')} */
		const client = req.routeOptions.config.client;
		const id = req.params.guild;
		const settings = await client.prisma.guild.findUnique({ where: { id } }) ??
			await client.prisma.guild.create({ data: { id } });

		return maskWebhookSecret(settings);
	},
	onRequest: [fastify.authenticate, fastify.isAdmin],
});

module.exports.patch = fastify => ({
	handler: async req => {
		// only known fields; prevents nested relation writes and foreign key changes
		const data = sanitize(req.body, schemas.guildSettings);
		const colours = ['errorColour', 'primaryColour', 'successColour'];
		for (const c of colours) {
			if (data[c] && !/^#[0-9a-f]{3,6}$/i.test(data[c]) && !(data[c] in Colors)) { // if not null/empty and not hex
				throw new ValidationError(c, `${data[c]} is not a valid colour. Valid colours are HEX and: ${Object.keys(Colors).join(', ')}`);
			}
		}

		/** @type {import('client')} */
		const client = req.routeOptions.config.client;
		const id = req.params.guild;
		const guild = client.guilds.cache.get(id);

		if (data.logChannel) {
			// the log channel must be a text channel in this guild
			const channel = guild.channels.cache.get(data.logChannel);
			if (!channel || !channel.isTextBased() || channel.type === ChannelType.GuildVoice) {
				throw new ValidationError('logChannel', 'must be a text channel in this server');
			}
		}

		if (Array.isArray(data.autoTag)) {
			data.autoTag = data.autoTag.filter(channelId => guild.channels.cache.has(channelId));
		}
		if (data.webhookSecret) {
			// required here rather than at the top so the route can be loaded without starting worker threads
			const { crypto } = require('../../../../../lib/threads').pools;
			await prepareWebhookSecret(data, text => crypto.queue(w => w.encrypt(text)));
		} else {
			await prepareWebhookSecret(data);
		}

		const original = await client.prisma.guild.findUnique({ where: { id } });
		const settings = await client.prisma.guild.update({
			data: data,
			include: { categories: { select: { id: true } } },
			where: { id },
		});

		// Update cached categories, which include guild settings
		for (const { id } of settings.categories) await client.tickets.getCategory(id, true);

		// don't log the categories
		delete settings.categories;

		logAdminEvent(client, {
			action: 'update',
			diff: {
				original: maskWebhookSecret(original),
				updated: maskWebhookSecret(settings),
			},
			guildId: id,
			target: {
				id,
				name: client.guilds.cache.get(id).name,
				type: 'settings',
			},
			userId: req.user.id,
		});
		return maskWebhookSecret(settings);
	},
	onRequest: [fastify.authenticate, fastify.isAdmin],
});
