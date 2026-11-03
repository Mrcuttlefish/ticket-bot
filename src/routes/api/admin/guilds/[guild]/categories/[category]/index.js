const { logAdminEvent } = require('../../../../../../../lib/logging');
const { sanitizeCategory } = require('../../../../../../../lib/validation');
const { checkCategoryRefs } = require('../../../../../../../lib/category-refs');
const {
	updateCommandPermissions,
	updateStaffRoles,
} = require('../../../../../../../lib/users');

module.exports.delete = fastify => ({
	handler: async (req, res) => {
		/** @type {import('client')} */
		const client = req.routeOptions.config.client;
		const guild = client.guilds.cache.get(req.params.guild);
		const categoryId = Number(req.params.category);
		const original = categoryId && await client.prisma.category.findUnique({ where: { id: categoryId } });
		if (!original || original.guildId !== guild.id) return res.status(400).send(new Error('Bad Request'));
		const category = await client.prisma.category.delete({ where: { id: categoryId } });

		const staffRoles = await updateStaffRoles(guild);

		if (req.user.accessToken && original.staffRoles?.length > 0) {
			updateCommandPermissions(guild, req.user.accessToken, staffRoles);
		}

		logAdminEvent(client, {
			action: 'delete',
			guildId: req.params.guild,
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

module.exports.get = fastify => ({
	handler: async (req, res) => {
		/** @type {import('client')} */
		const client = req.routeOptions.config.client;
		const guildId = req.params.guild;
		const categoryId = Number(req.params.category);
		const category = await client.prisma.category.findUnique({
			include: {
				questions: {
					select: {
						// createdAt: true,
						id: true,
						label: true,
						maxLength: true,
						minLength: true,
						options: true,
						order: true,
						placeholder: true,
						required: true,
						style: true,
						type: true,
						value: true,
					},
				},
			},
			where: { id: categoryId },
		});

		if (!category || category.guildId !== guildId) return res.status(400).send(new Error('Bad Request'));

		return category;
	},
	onRequest: [fastify.authenticate, fastify.isAdmin],
});

module.exports.patch = fastify => ({
	handler: async (req, res) => {
		/** @type {import('client')} */
		const client = req.routeOptions.config.client;
		const guildId = req.params.guild;
		const categoryId = Number(req.params.category);
		/** @type {import('discord.js').Guild} */
		const guild = client.guilds.cache.get(req.params.guild);
		// only known fields; prevents nested relation writes and foreign key changes
		const {
			data,
			questions,
		} = sanitizeCategory(req.body);

		// drop roles that aren't in this server and reject Discord categories from other servers
		checkCategoryRefs(guild, data, id => client.channels.cache.get(id));

		const select = {
			archive: true,
			autoClose: true,
			blockedRoles: true,
			channelName: true,
			claimButton: true,
			claiming: true,
			closeButton: true,
			// createdAt: true,
			description: true,
			discordCategory: true,
			emoji: true,
			enableFeedback: true,
			fallbackCategories: true,
			guildId: true,
			id: true,
			image: true,
			memberLimit: true,
			name: true,
			openingMessage: true,
			pingRoleRules: true,
			pingRoles: true,
			questions: {
				select: {
					// createdAt: true,
					id: true,
					label: true,
					maxLength: true,
					minLength: true,
					options: true,
					order: true,
					placeholder: true,
					required: true,
					style: true,
					type: true,
					value: true,
				},
			},
			ratelimit: true,
			requireTopic: true,
			requiredRoles: true,
			roleLimits: true,
			staleAfter: true,
			staffRoles: true,
			totalLimit: true,
		};

		const original = req.params.category && await client.prisma.category.findUnique({
			select,
			where: { id: categoryId },
		});

		if (!original || original.guildId !== guildId) return res.status(400).send(new Error('Bad Request'));

		// questions that already exist must belong to this category; anything else is created
		let questionWrites;
		if (questions) {
			const existingIds = new Set(original.questions.map(q => q.id));
			questionWrites = {
				create: [],
				update: [],
			};
			for (const q of questions) {
				const id = q.id;
				delete q.id;
				if (id && existingIds.has(id)) {
					questionWrites.update.push({
						data: q,
						where: { id },
					});
				} else {
					questionWrites.create.push(q);
				}
			}
		}

		const category = await client.prisma.category.update({
			data: {
				...data,
				questions: questionWrites,
			},
			select,
			where: { id: categoryId },
		});

		// update caches
		await client.tickets.getCategory(categoryId, true);
		const staffRoles = await updateStaffRoles(guild);

		if (req.user.accessToken && JSON.stringify(category.staffRoles) !== JSON.stringify(original.staffRoles)) {
			updateCommandPermissions(guild, req.user.accessToken, staffRoles);
		}

		logAdminEvent(client, {
			action: 'update',
			diff: {
				original,
				updated: category,
			},
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
