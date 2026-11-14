/** Statistics for the dashboard (see lib/statistics.js). */

const ms = require('ms');
const {
	DAY, buildStatistics,
} = require('../../../../../lib/statistics');

module.exports.get = fastify => ({
	handler: async req => {
		/** @type {import('client')} */
		const client = req.routeOptions.config.client;
		const guildId = req.params.guild;
		const days = Math.min(Math.max(Number.parseInt(req.query.days, 10) || 30, 7), 365);
		const cacheKey = `cache/statistics:${guildId}:${days}`;
		const cached = await client.keyv.get(cacheKey);
		if (cached) return cached;

		const now = Date.now();
		const since = new Date(now - (days * DAY));
		const [categoryRows, tickets] = await Promise.all([
			client.prisma.category.findMany({
				select: {
					anonymous: true,
					id: true,
					name: true,
				},
				where: { guildId },
			}),
			client.prisma.ticket.findMany({
				select: {
					categoryId: true,
					claimedById: true,
					closedAt: true,
					closedById: true,
					createdAt: true,
					createdById: true,
					feedback: { select: { rating: true } },
					firstResponseAt: true,
				},
				where: {
					guildId,
					OR: [
						{ createdAt: { gte: since } },
						{ closedAt: { gte: since } },
					],
				},
			}),
		]);
		const categories = new Map(categoryRows.map(c => [c.id, c]));
		const statistics = buildStatistics(tickets, {
			categories,
			days,
			now,
		});
		const guild = client.guilds.cache.get(guildId);
		for (const entry of statistics.staff) {
			const member = guild?.members.cache.get(entry.id) ?? await guild?.members.fetch(entry.id).catch(() => null);
			entry.avatar = member?.displayAvatarURL?.() ?? null;
			entry.displayName = member?.displayName ?? null;
			entry.username = member?.user?.username ?? null;
		}
		statistics.open = await client.prisma.ticket.count({
			where: {
				guildId,
				open: true,
			},
		});
		await client.keyv.set(cacheKey, statistics, ms('5m'));
		return statistics;
	},
	onRequest: [fastify.authenticate, fastify.isAdmin],
});
