const { logAdminEvent } = require('../../../../../../lib/logging');
const { sanitizeTag } = require('../../../../../../lib/tags');

module.exports.delete = fastify => ({
	handler: async (req, res) => {
		/** @type {import('client')} */
		const client = req.routeOptions.config.client;
		const guildId = req.params.guild;
		const tagId = Number(req.params.tag);
		const original = tagId && await client.prisma.tag.findUnique({ where: { id: tagId } });
		if (!original || original.guildId !== guildId) return res.status(400).send(new Error('Bad Request'));
		const tag = await client.prisma.tag.delete({ where: { id: tagId } });

		const cacheKey = `cache/guild-tags:${guildId}`;
		await client.keyv.delete(cacheKey); // getGuildTags reloads (and sorts) them

		logAdminEvent(client, {
			action: 'delete',
			guildId: req.params.guild,
			target: {
				id: tag.id,
				name: tag.name,
				type: 'tag',
			},
			userId: req.user.id,
		});

		return tag;
	},
	onRequest: [fastify.authenticate, fastify.isAdmin],
});

module.exports.get = fastify => ({
	handler: async (req, res) => {
		/** @type {import('client')} */
		const client = req.routeOptions.config.client;
		const guildId = req.params.guild;
		const tagId = Number(req.params.tag);
		const tag = await client.prisma.tag.findUnique({ where: { id: tagId } });

		if (!tag || tag.guildId !== guildId) return res.status(400).send(new Error('Bad Request'));

		return tag;
	},
	onRequest: [fastify.authenticate, fastify.isAdmin],
});

module.exports.patch = fastify => ({
	handler: async (req, res) => {
		/** @type {import('client')} */
		const client = req.routeOptions.config.client;
		const guildId = req.params.guild;
		const tagId = Number(req.params.tag);
		const guild = client.guilds.cache.get(req.params.guild);
		const original = req.params.tag && await client.prisma.tag.findUnique({ where: { id: tagId } });

		if (!original || original.guildId !== guildId) return res.status(400).send(new Error('Bad Request'));

		const data = sanitizeTag(req.body, original.matchType);

		const tag = await client.prisma.tag.update({
			data,
			where: { id: tagId },
		});

		const cacheKey = `cache/guild-tags:${guildId}`;
		await client.keyv.delete(cacheKey); // getGuildTags reloads (and sorts) them

		logAdminEvent(client, {
			action: 'update',
			diff: {
				original,
				updated: tag,
			},
			guildId: guild.id,
			target: {
				id: tag.id,
				name: tag.name,
				type: 'tag',
			},
			userId: req.user.id,
		});

		return tag;
	},
	onRequest: [fastify.authenticate, fastify.isAdmin],
});
