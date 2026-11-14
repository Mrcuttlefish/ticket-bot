/**
 * The server's settings change history (Ticket Tool parity, P3): every change made in the dashboard, newest first.
 * Filter with `type` (settings, category, panel, question, tag) and page with `before` (an entry's id).
 */

const TARGET_TYPES = ['category', 'panel', 'question', 'settings', 'tag'];

module.exports.get = fastify => ({
	handler: async (req, res) => {
		/** @type {import('client')} */
		const client = req.routeOptions.config.client;
		const guildId = req.params.guild;
		const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
		const before = Number.parseInt(req.query.before, 10);
		const type = req.query.type;
		if (type !== undefined && !TARGET_TYPES.includes(type)) {
			return res.code(400).send({
				error: 'Bad Request',
				message: `type must be one of ${TARGET_TYPES.join(', ')}`,
				statusCode: 400,
			});
		}
		const entries = await client.prisma.auditLog.findMany({
			orderBy: { id: 'desc' },
			take: limit + 1,
			where: {
				guildId,
				...(Number.isSafeInteger(before) && before > 0 && { id: { lt: before } }),
				...(type && { targetType: type }),
			},
		});
		const guild = client.guilds.cache.get(guildId);
		const users = new Map();
		for (const { userId } of entries) {
			if (users.has(userId)) continue;
			const member = guild?.members.cache.get(userId) ?? await guild?.members.fetch(userId).catch(() => null);
			const user = member?.user ?? client.users.cache.get(userId);
			users.set(userId, {
				avatar: user?.displayAvatarURL?.() ?? null,
				displayName: member?.displayName ?? user?.globalName ?? user?.username ?? null,
				id: userId,
				username: user?.username ?? null,
			});
		}
		return {
			entries: entries.slice(0, limit).map(entry => ({
				action: entry.action,
				changes: entry.changes ?? [],
				createdAt: entry.createdAt,
				id: entry.id,
				target: {
					id: entry.targetId,
					name: entry.targetName,
					type: entry.targetType,
				},
				user: users.get(entry.userId),
			})),
			next: entries.length > limit ? entries[limit - 1].id : null,
		};
	},
	onRequest: [fastify.authenticate, fastify.isAdmin],
});
