const { logAdminEvent } = require('../../../../../../lib/logging');
const { sanitizeTag } = require('../../../../../../lib/tags');

module.exports.get = fastify => ({
	handler: async req => {
		/** @type {import('client')} */
		const client = req.routeOptions.config.client;

		const { tags } = await client.prisma.guild.findUnique({
			select: { tags: true },
			where: { id: req.params.guild },
		});

		return tags;
	},
	onRequest: [fastify.authenticate, fastify.isAdmin],
});


module.exports.post = fastify => ({
	handler: async req => {
		/** @type {import('client')} */
		const client = req.routeOptions.config.client;
		const guild = client.guilds.cache.get(req.params.guild);
		const data = sanitizeTag(req.body);
		const tag = await client.prisma.tag.create({
			data: {
				...data,
				guild: { connect: { id: guild.id } },
			},
		});

		const cacheKey = `cache/guild-tags:${guild.id}`;
		await client.keyv.delete(cacheKey); // getGuildTags reloads (and sorts) them

		logAdminEvent(client, {
			action: 'create',
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
