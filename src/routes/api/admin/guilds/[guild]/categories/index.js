const { logAdminEvent } = require('../../../../../../lib/logging');
const {
	updateCommandPermissions,
	updateStaffRoles,
} = require('../../../../../../lib/users');
const emoji = require('node-emoji');
const { ChannelType: { GuildCategory } } = require('discord.js');
const ms = require('ms');
const {
	ValidationError,
	sanitizeCategory,
} = require('../../../../../../lib/validation');
const {
	getAverageTimes, getAverageRating,
} = require('../../../../../../lib/stats');

module.exports.get = fastify => ({
	handler: async req => {
		/** @type {import('client')} */
		const client = req.routeOptions.config.client;

		let { categories } = await client.prisma.guild.findUnique({
			select: {
				categories: {
					select: {
						createdAt: true,
						description: true,
						discordCategory: true,
						emoji: true,
						id: true,
						image: true,
						name: true,
						requiredRoles: true,
						staffRoles: true,
						tickets: {
							select: {
								closedAt: true,
								createdAt: true,
							    feedback: { select: { rating: true } },
								firstResponseAt: true,
							},
							where: {
								firstResponseAt: { not: null },
								open: false,
							},
						},
					},
				},
			},
			where: { id: req.params.guild },
		});

		categories = await Promise.all(
			categories.map(async category => {
				const {
					avgResolutionTime,
					avgResponseTime,
				} = await getAverageTimes(category.tickets);
				const avgRating = await getAverageRating(category.tickets);
				category = {
					...category,
					stats: {
						avgRating: avgRating.toFixed(1),
						avgResolutionTime: ms(avgResolutionTime),
						avgResponseTime: ms(avgResponseTime),
					},
				};
				delete category.tickets;
				return category;
			}),
		);

		return categories;
	},
	onRequest: [fastify.authenticate, fastify.isAdmin],
});

module.exports.post = fastify => ({
	handler: async req => {
		/** @type {import('client')} */
		const client = req.routeOptions.config.client;

		const user = await client.users.fetch(req.user.id);
		const guild = client.guilds.cache.get(req.params.guild);
		// only known fields; prevents nested relation writes and foreign key changes
		const {
			data,
			questions,
		} = sanitizeCategory(req.body);
		data.staffRoles ??= [];
		const allow = ['ViewChannel', 'ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'AttachFiles'];

		// drop roles that aren't in this server (e.g. deleted roles, or roles from another server)
		for (const field of ['staffRoles', 'pingRoles', 'requiredRoles']) {
			if (data[field]) data[field] = data[field].filter(id => guild.roles.cache.has(id));
		}

		if (data.discordCategory) {
			const channel = client.channels.cache.get(data.discordCategory);
			// unknown channels are tolerated (it may have been deleted), but not channels from another server
			if (channel && (channel.guildId !== guild.id || channel.type !== GuildCategory)) {
				throw new ValidationError('discordCategory', 'must be a category channel in this server');
			}
		}

		if (!data.discordCategory) {
			let name = data.name;
			if (emoji.hasEmoji(data.emoji)) name = `${emoji.get(data.emoji)} ${name}`;
			const channel = await guild.channels.create({
				name,
				permissionOverwrites: [
					...[
						{
							deny: ['ViewChannel'],
							id: guild.roles.everyone,
						},
						{
							allow: allow,
							id: client.user.id,
						},
					],
					...data.staffRoles.map(id => ({
						allow: allow,
						id,
					})),
				],
				position: 1,
				reason: `Tickets category created by ${user.tag}`,
				type: GuildCategory,
			});
			data.discordCategory = channel.id;
		}

		data.channelName ||= 'ticket-{num}'; // not ??=, expect empty string

		const category = await client.prisma.category.create({
			data: {
				...data,
				guild: { connect: { id: guild.id } },
				questions: {
					createMany: {
						data: (questions ?? []).map(q => {
							delete q.id; // let the database generate IDs
							return q;
						}),
					},
				},
			},
		});

		// update caches
		await client.tickets.getCategory(category.id, true);
		const staffRoles = await updateStaffRoles(guild);

		if (req.user.accessToken) {
			updateCommandPermissions(guild, req.user.accessToken, staffRoles);
		}

		logAdminEvent(client, {
			action: 'create',
			guildId: guild.id,
			target: {
				id: category.id,
				name: category.name,
				type: 'category',
			},
			userId: req.user.id,
		});

		return category;
	},
	onRequest: [fastify.authenticate, fastify.isAdmin],
});
