/* eslint-disable no-underscore-dangle */
/* eslint-disable max-lines */
const TicketArchiver = require('./archiver');
const { getPortalEvents } = require('./portal');
const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	inlineCode,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	MessageFlags,
} = require('discord.js');
const ms = require('ms');
const ExtendedEmbedBuilder = require('../embed');
const { logTicketEvent } = require('../logging');
const { increment } = require('../metrics');
const { sendTicketWebhook } = require('./webhook-events');
const { isStaff } = require('../users');
const { getWorkingStatus } = require('./working-hours');
const { offerTags } = require('./tag-suggestions');
const {
	buildQuestionComponent, readAnswer,
} = require('./question-input');
const {
	buildButtons, buildOpeningMessage, editOpeningButtons,
} = require('./opening-message');
const {
	getMemberLimit, getNumberBase, getPingRoles, pickDiscordCategory, resolveCategorySettings,
} = require('./options');
const {
	formatChannelName, formatChannelTopic, formatOpeningMessage,
} = require('./placeholders');
const { Collection } = require('discord.js');

const { getSUID } = require('../logging');
const {
	getAverageTimes, getAverageRating,
} = require('../stats');
const { pools } = require('../threads');
const { buttonEmoji } = require('../icons');
const { guildChannel } = require('../logging');
const {
	buildClosedControls, getChannelDeleteAt, keepsClosedChannels, lockChannel, unlockChannel,
} = require('./closed');
const {
	buildTranscriptAttachment, transcriptTargets,
} = require('./transcript-file');
const { PermissionsBitField } = require('discord.js');

const { crypto } = pools;

/**
 * @typedef {import('@prisma/client').Category &
 * 	{guild: import('@prisma/client').Guild} &
 * 	{questions: import('@prisma/client').Question[]}} CategoryGuildQuestions
 */

/**
 * @typedef {import('@prisma/client').Ticket &
 * 	{category: import('@prisma/client').Category} &
 * 	{feedback: import('@prisma/client').Feedback} &
 * 	{guild: import('@prisma/client').Guild}} TicketCategoryFeedbackGuild
 */

module.exports = class TicketManager {
	constructor(client) {
		/** @type {import("client")} */
		this.client = client;
		this.archiver = new TicketArchiver(client);
		this.$count = { categories: {} };
		this.$numbers = {};
		// how long the "closed" message is shown before the channel is deleted
		this.closeDelay = 3e3;
		this.$stale = new Collection();
		// IDs of anonymous staff messages that were posted again by the bot (see anonymous.js)
		this.$relayed = new Set();
	}

	/**
	 * Retrieve cached category data
	 * @param {string} categoryId the category ID
	 * @param {boolean} force bypass & update the cache?
	 * @returns {Promise<CategoryGuildQuestions>}
	 */
	async getCategory(categoryId, force) {
		const cacheKey = `cache/category+guild+questions:${categoryId}`;
		/** @type {CategoryGuildQuestions} */
		let category = await this.client.keyv.get(cacheKey);
		if (!category || force) {
			category = await this.client.prisma.category.findUnique({
				include: {
					guild: true,
					questions: { orderBy: { order: 'asc' } },
				},
				where: { id: categoryId },
			});
			await this.client.keyv.set(cacheKey, category, ms('12h'));
		}
		return category;
	}

	/**
	 * Retrieve cached ticket data for the closing sequence
	 * @param {string} ticketId the ticket ID
	 * @param {boolean} force bypass & update the cache?
	 * @returns {Promise<TicketCategoryFeedbackGuild>}
	 */
	async getTicket(ticketId, force) {
		const cacheKey = `cache/ticket+category+feedback+guild:${ticketId}`;
		/** @type {TicketCategoryFeedbackGuild} */
		let ticket = await this.client.keyv.get(cacheKey);
		if (!ticket || force) {
			ticket = await this.client.prisma.ticket.findUnique({
				include: {
					category: true,
					feedback: true,
					guild: true,
				},
				where: { id: ticketId },
			});
			await this.client.keyv.set(cacheKey, ticket, ms('3m'));
		}
		return ticket;
	}

	async getTotalCount(categoryId) {
		this.$count.categories[categoryId] ||= {};
		let count = this.$count.categories[categoryId].total;
		if (!count) {
			count = await this.client.prisma.ticket.count({
				where: {
					categoryId,
					open: true,
				},
			});
			this.$count.categories[categoryId].total = count;
		}
		return count;
	}

	async getMemberCount(categoryId, memberId) {
		this.$count.categories[categoryId] ||= {};
		let count = this.$count.categories[categoryId][memberId];
		if (!count) {
			count = await this.client.prisma.ticket.count({
				where: {
					categoryId: categoryId,
					createdById: memberId,
					open: true,
				},
			});
			this.$count.categories[categoryId][memberId] = count;
		}
		return count;
	}

	async getCooldown(categoryId, memberId) {
		const cacheKey = `cooldowns/category-member:${categoryId}-${memberId}`;
		return await this.client.keyv.get(cacheKey);
	}

	/**
	 * @param {import("discord.js").Guild} guild
	 * @param {object} category
	 * @returns {string | null} the ID of a Discord category with space for another channel
	 */
	pickDiscordCategory(guild, category) {
		return pickDiscordCategory(category, id => {
			const channel = guild.channels.cache.get(id);
			if (!channel || channel.type !== ChannelType.GuildCategory) return null;
			return channel.children.cache.size;
		});
	}

	async getNextNumber(guildId, offset = 0) {
		if (this.$numbers[guildId] === undefined) {
			const { _max: { number: max } } = await this.client.prisma.ticket.aggregate({
				_max: { number: true },
				where: { guildId },
			});
			this.$numbers[guildId] = max ?? 0;
		}
		// the offset is read every time so changing the setting takes effect without a restart
		this.$numbers[guildId] = getNumberBase(this.$numbers[guildId], offset) + 1;
		return this.$numbers[guildId];
	}

	/**
	 * @param {object} data
	 * @param {string} data.categoryId
	 * @param {import("discord.js").ChatInputCommandInteraction
	 * | import("discord.js").ButtonInteraction
	 * | import("discord.js").SelectMenuInteraction} data.interaction
	 * @param {string?} [data.topic]
	 */
	async create({
		categoryId, interaction, topic, referencesMessageId, referencesTicketId,
	}) {
		categoryId = Number(categoryId);
		const category = await this.getCategory(categoryId);

		if (!category) {
			let settings;
			if (interaction.guild) {
				settings = await this.client.prisma.guild.findUnique({ where: { id: interaction.guild.id } });
			} else {
				settings = {
					errorColour: 'Red',
					locale: 'en-GB',
				};
			}
			const getMessage = this.client.i18n.getLocale(settings.locale);
			return await interaction.reply({
				embeds: [
					new ExtendedEmbedBuilder({
						iconURL: interaction.guild?.iconURL(),
						text: settings.footer,
					})
						.setColor(settings.errorColour)
						.setTitle(getMessage('misc.unknown_category.title'))
						.setDescription(getMessage('misc.unknown_category.description')),
				],
				flags: MessageFlags.Ephemeral,
			});
		}

		/** @type {import("discord.js").Guild} */
		const guild = this.client.guilds.cache.get(category.guild.id);
		const member = interaction.member ?? await guild.members.fetch(interaction.user.id);
		const getMessage = this.client.i18n.getLocale(category.guild.locale);

		const rlKey = `ratelimits/guild-user:${category.guildId}-${interaction.user.id}`;
		const rl = await this.client.keyv.get(rlKey);
		if (rl) {
			return await interaction.reply({
				embeds: [
					new ExtendedEmbedBuilder({
						iconURL: guild.iconURL(),
						text: category.guild.footer,
					})
						.setColor(category.guild.errorColour)
						.setTitle(getMessage('misc.ratelimited.title'))
						.setDescription(getMessage('misc.ratelimited.description')),
				],
				flags: MessageFlags.Ephemeral,
			});
		} else {
			this.client.keyv.set(rlKey, true, ms('5s'));
		}

		const sendError = name => interaction.reply({
			embeds: [
				new ExtendedEmbedBuilder({
					iconURL: guild.iconURL(),
					text: category.guild.footer,
				})
					.setColor(category.guild.errorColour)
					.setTitle(getMessage(`misc.${name}.title`))
					.setDescription(getMessage(`misc.${name}.description`)),
			],
			flags: MessageFlags.Ephemeral,
		});

		// the guild's blocklist plus the category's blocked roles (upstream PR #495)
		const { blockedRoles } = resolveCategorySettings(category.guild, category);
		if (blockedRoles.length !== 0) {
			const blocked = blockedRoles.some(r => member.roles.cache.has(r));
			if (blocked) return await sendError('blocked');
		}

		// Don't let timed out users open tickets, they won't be able to write anything inside
		if (member.isCommunicationDisabled()) {
			return await sendError('blocked');
		}

		if (category.requiredRoles.length !== 0) {
			const missing = category.requiredRoles.some(r => !member.roles.cache.has(r));
			if (missing) return await sendError('missing_roles');
		}

		// the main Discord category, or the first fallback category that isn't full (upstream #472)
		if (!this.pickDiscordCategory(guild, category)) return await sendError('category_full');

		const totalCount = await this.getTotalCount(category.id);
		if (totalCount >= category.totalLimit) return await sendError('category_full');

		const memberCount = await this.getMemberCount(category.id, interaction.user.id);
		if (memberCount >= getMemberLimit(category, id => member.roles.cache.has(id))) {
			return await interaction.reply({
				embeds: [
					new ExtendedEmbedBuilder({
						iconURL: guild.iconURL(),
						text: category.guild.footer,
					})
						.setColor(category.guild.errorColour)
						.setTitle(getMessage('misc.member_limit.title', memberCount, memberCount))
						.setDescription(getMessage('misc.member_limit.description', memberCount)),
				],
				flags: MessageFlags.Ephemeral,
			});
		}

		const cooldown = await this.getCooldown(category.id, interaction.user.id);
		if (cooldown) {
			return await interaction.reply({
				embeds: [
					new ExtendedEmbedBuilder({
						iconURL: guild.iconURL(),
						text: category.guild.footer,
					})
						.setColor(category.guild.errorColour)
						.setTitle(getMessage('misc.cooldown.title'))
						.setDescription(getMessage('misc.cooldown.description', { time: ms(cooldown - Date.now()) })),
				],
				flags: MessageFlags.Ephemeral,
			});
		}

		if (category.questions.length >= 1) {
			await interaction.showModal(
				new ModalBuilder()
					.setCustomId(JSON.stringify({
						action: 'questions',
						categoryId,
						referencesMessageId,
						referencesTicketId,
					}))
					.setTitle(category.name)
					// labels hold either a text input or a select menu (upstream #446)
					.addLabelComponents(category.questions.slice(0, 5).map(q => buildQuestionComponent(q))),
			);
		} else if (category.requireTopic && !topic) {
			await interaction.showModal(
				new ModalBuilder()
					.setCustomId(JSON.stringify({
						action: 'topic',
						categoryId,
						referencesMessageId,
						referencesTicketId,
					}))
					.setTitle(category.name)
					.setComponents(
						new ActionRowBuilder()
							.setComponents(
								new TextInputBuilder()
									.setCustomId('topic')
									.setLabel(getMessage('modals.topic.label'))
									.setStyle(TextInputStyle.Paragraph)
									.setMaxLength(1000)
									.setMinLength(5)
									.setPlaceholder(getMessage('modals.topic.placeholder'))
									.setRequired(true),
							),
					),
			);
		} else {
			await this.postQuestions({
				categoryId,
				interaction,
				referencesMessageId,
				referencesTicketId,
				topic,
			});
		}
	}

	/**
	 * @param {object} data
	 * @param {string} data.category
	 * @param {import("discord.js").ButtonInteraction
	 * | import("discord.js").SelectMenuInteraction
	 * | import("discord.js").ModalSubmitInteraction} data.interaction
	 * @param {string?} [data.topic]
	 */
	async postQuestions({
		action, categoryId, interaction, topic, referencesMessageId, referencesTicketId,
	}) {
		const [, category] = await Promise.all([
			interaction.deferReply({ flags: MessageFlags.Ephemeral }),
			this.getCategory(categoryId),
		]);

		let answers;
		const plainAnswers = [];
		if (interaction.isModalSubmit()) {
			if (action === 'questions') {
				answers = await Promise.all(
					category.questions
						.slice(0, 5)
						.map(async q => {
							const value = readAnswer(interaction.fields, q);
							if (value) plainAnswers.push(value);
							return {
								questionId: q.id,
								userId: interaction.user.id,
								value: value ? await crypto.queue(w => w.encrypt(value)) : '',
							};
						}),
				);
				if (category.customTopic) {
					const question = category.questions.find(q => q.id === category.customTopic);
					if (question) topic = readAnswer(interaction.fields, question) || null;
				}
			} else if (action === 'topic') {
				topic = interaction.fields.getTextInputValue('topic');
			}
		}

		/** @type {import("discord.js").Guild} */
		const guild = this.client.guilds.cache.get(category.guild.id);
		const getMessage = this.client.i18n.getLocale(category.guild.locale);

		// suggest tags that might solve the problem first (upstream #440)
		if (category.suggestTags) {
			const { proceed } = await offerTags({
				category,
				client: this.client,
				getMessage,
				interaction,
				text: [topic, ...plainAnswers].filter(Boolean).join('\n'),
			});
			if (!proceed) return;
		}

		const creator = await guild.members.fetch(interaction.user.id);
		const number = await this.getNextNumber(category.guild.id, category.guild.ticketNumberOffset);
		const parent = this.pickDiscordCategory(guild, category);
		if (!parent) throw new Error(`Every Discord category for category ${category.id} is full`);
		const channelName = formatChannelName(category.channelName, {
			displayName: creator.displayName,
			number,
			username: creator.user.username,
		});
		const allow = ['ViewChannel', 'ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'AttachFiles'];
		/** @type {import("discord.js").TextChannel} */
		const channel = await guild.channels.create({
			name: channelName,
			parent,
			permissionOverwrites: [
				{
					deny: ['ViewChannel'],
					id: guild.roles.everyone.id,
				},
				{
					allow,
					id: this.client.user.id,
				},
				{
					allow,
					id: creator.id,
				},
				...category.staffRoles.map(id => ({
					allow,
					id,
				})),
			],
			rateLimitPerUser: category.ratelimit,
			reason: `${creator.user.tag} created a ticket`,
			topic: formatChannelTopic(this.client.config.tickets?.channelTopic, creator.toString(), topic) ?? undefined,
		});

		const needsStats = /{+\s?(avgResponseTime|avgResolutionTime|avgRating)\s?}+/i.test(category.openingMessage);
		const statsCacheKey = `cache/category-stats/${categoryId}`;
		let stats = await this.client.keyv.get(statsCacheKey);
		if (needsStats && !stats) {
			const closedTickets = await this.client.prisma.ticket.findMany({
				select: {
					closedAt: true,
					createdAt: true,
					feedback: { select: { rating: true } },
					firstResponseAt: true,
				},
				where: {
					categoryId: category.id,
					firstResponseAt: { not: null },
					open: false,
				},
			});
			const {
				avgResolutionTime,
				avgResponseTime,
			} = await getAverageTimes(closedTickets);
			const avgRating = await getAverageRating(closedTickets);
			stats = {
				avgRating: avgRating.toFixed(1),
				avgResolutionTime: ms(avgResolutionTime, { long: true }),
				avgResponseTime: ms(avgResponseTime, { long: true }),
			};
			this.client.keyv.set(statsCacheKey, stats, ms('1h'));
		}

		let fields = [];
		if (answers) {
			fields = category.questions.slice(0, 5).map(q => ({
				name: q.label,
				value: readAnswer(interaction.fields, q) || getMessage('ticket.answers.no_value'),
			}));
		} else if (topic) {
			fields = [{
				name: getMessage('ticket.opening_message.fields.topic'),
				value: topic,
			}];
		}

		const categorySettings = resolveCategorySettings(category.guild, category);
		const pings = getPingRoles(category, id => creator.roles.cache.has(id)).map(r => `<@&${r}>`).join(' ');

		const sent = await channel.send(buildOpeningMessage({
			author: {
				avatar: creator.displayAvatarURL(),
				name: creator.displayName,
			},
			buttons: buildButtons({
				claim: categorySettings.claimButton && category.claiming ? 'claim' : null,
				close: categorySettings.closeButton,
				edit: Boolean(topic || answers),
				getMessage,
			}),
			colour: category.guild.primaryColour,
			content: getMessage('ticket.opening_message.content', {
				creator: interaction.user.toString(),
				staff: pings ? pings + ',' : '',
			}),
			description: formatOpeningMessage(category.openingMessage, {
				...stats,
				category,
				creator,
				number,
				topic,
			}).trim() || null,
			fields,
			footer: category.guild.footer
				? {
					iconURL: guild.iconURL(),
					text: category.guild.footer,
				}
				: null,
			image: category.image,
			style: category.openingStyle,
			v2: category.guild.componentsV2,
		}));

		sent.pin({ reason: 'Ticket opening message' })
			.then(() => {
				const recent = channel.messages.cache.last(3);
				for (const message of recent) {
					if (message.system) {
						message
							.delete({ reason: 'Cleaning up system message' })
							.catch(() => this.client.log.warn('Failed to delete system pin message'));
					}
				}
			})
			.catch(this.client.log.error);

		/** @type {import("discord.js").Message|undefined} */
		let message;
		if (referencesMessageId) {
			/** @type {import("discord.js").Message} */
			message = await interaction.channel.messages.fetch(referencesMessageId);
			if (message) {
				// not worth the effort of making system messages work atm
				if (message.system || !message.content) {
					referencesMessageId = null;
					message = null;
				} else {
					if (!message.member) {
						try {
							message.member = await message.guild.members.fetch(message.author.id);
						} catch {
							this.client.log.verbose('Failed to fetch member %s of %s', message.author.id, message.guild.id);
						}
					}
					channel.send({
						embeds: [
							new ExtendedEmbedBuilder()
								.setColor(category.guild.primaryColour)
								.setTitle(getMessage('ticket.references_message.title'))
								.setDescription(
									getMessage('ticket.references_message.description', {
										author: message.author.toString(),
										timestamp: `<t:${Math.ceil(message.createdTimestamp / 1000)}:R>`,
										url: message.url,
									})),
							new ExtendedEmbedBuilder({
								iconURL: guild.iconURL(),
								text: category.guild.footer,
							})
								.setColor(category.guild.primaryColour)
								.setAuthor({
									iconURL: message.member?.displayAvatarURL(),
									name: message.member?.displayName || 'Unknown',
								})
								.setDescription(message.content.substring(0, 1000) + (message.content.length > 1000 ? '...' : '')),
						],
					}).catch(this.client.log.error);
				}

			}
		} else if (referencesTicketId) {
			// TODO: add portal url
			const ticket = await this.client.prisma.ticket.findUnique({ where: { id: String(referencesTicketId) } });
			// only reference tickets from this guild that the user created (or can see as staff),
			// otherwise any user could leak the topic of any ticket into a new one
			if (
				!ticket ||
				ticket.guildId !== category.guild.id ||
				(ticket.createdById !== interaction.user.id && !(await isStaff(guild, interaction.user.id)))
			) {
				referencesTicketId = null;
			} else {
				const embed = new ExtendedEmbedBuilder({
					iconURL: guild.iconURL(),
					text: category.guild.footer,
				})
					.setColor(category.guild.primaryColour)
					.setTitle(getMessage('ticket.references_ticket.title'))
					.setDescription(getMessage('ticket.references_ticket.description'))
					.setFields([
						{
							inline: true,
							name: getMessage('ticket.references_ticket.fields.number'),
							value: inlineCode(ticket.number),
						},
						{
							inline: true,
							name: getMessage('ticket.references_ticket.fields.date'),
							value: `<t:${Math.ceil(ticket.createdAt / 1000)}:f>`,
						},
					]);
				if (ticket.topic) {
					embed.addFields({
						inline: false,
						name: getMessage('ticket.references_ticket.fields.topic'),
						value: await crypto.queue(w => w.decrypt(ticket.topic)),
					});
				}
				channel.send({
					components: resolveCategorySettings(category.guild, category).archive
						? [
							new ActionRowBuilder()
								.addComponents(
									new ButtonBuilder()
										.setCustomId(JSON.stringify({
											action: 'transcript',
											ticket: referencesTicketId,
										}))
										.setStyle(ButtonStyle.Primary)
										.setEmoji(buttonEmoji(getMessage, 'transcript'))
										.setLabel(getMessage('buttons.transcript.text')),

								),
						]
						: [],
					embeds: [embed],
				}).catch(this.client.log.error);
			}
		}

		const data = {
			category: { connect: { id: categoryId } },
			createdBy: {
				connectOrCreate: {
					create: { id: interaction.user.id },
					where: { id: interaction.user.id },
				},
			},
			guild: { connect: { id: category.guild.id } },
			id: channel.id,
			number,
			openingMessageId: sent.id,
			topic: topic ? await crypto.queue(w => w.encrypt(topic)) : null,
		};
		if (referencesTicketId) data.referencesTicket = { connect: { id: referencesTicketId } };
		if (answers) data.questionAnswers = { createMany: { data: answers } };

		await interaction.editReply({
			components: [],
			embeds: [
				new ExtendedEmbedBuilder({
					iconURL: guild.iconURL(),
					text: category.guild.footer,
				})
					.setColor(category.guild.successColour)
					.setTitle(getMessage('ticket.created.title'))
					.setDescription(getMessage('ticket.created.description', { channel: channel.toString() })),
			],
		});

		try {
			const ticket = await this.client.prisma.ticket.create({ data });

			// the opening message was sent before the ticket existed, so messageCreate couldn't archive it (upstream #504)
			if (resolveCategorySettings(category.guild, category).archive) {
				this.archiver.saveMessage(ticket.id, sent).catch(error => this.client.log.error(error));
			}
			this.$count.categories[categoryId].total++;
			this.$count.categories[categoryId][creator.id]++;

			if (category.cooldown) {
				const cacheKey = `cooldowns/category-member:${category.id}-${ticket.createdById}`;
				const expiresAt = ticket.createdAt.getTime() + category.cooldown;
				const TTL = category.cooldown;
				await this.client.keyv.set(cacheKey, expiresAt, TTL);
			}

			if (resolveCategorySettings(category.guild, category).archive && message) {
				if (
					await this.client.prisma.archivedMessage.findUnique({ where: { id: message.id } }) ||
					await this.archiver.saveMessage(ticket.id, message, true)
				) {
					await this.client.prisma.ticket.update({
						data: { referencesMessageId: message.id },
						where: { id: ticket.id },
					});
				}
			}

			increment('tickets_created_total');
			sendTicketWebhook(this.client, 'ticket.created', ticket.id);
			logTicketEvent(this.client, {
				action: 'create',
				target: {
					id: ticket.id,
					name: channel.toString(),
				},
				userId: interaction.user.id,
			});
		} catch (error) {
			const ref = getSUID();
			this.client.log.warn.tickets('An error occurred whilst creating ticket', channel.id);
			this.client.log.error.tickets(ref);
			this.client.log.error.tickets(error);
			await interaction.editReply({
				components: [],
				embeds: [
					new ExtendedEmbedBuilder()
						.setColor('Orange')
						.setTitle(getMessage('misc.error.title'))
						.setDescription(getMessage('misc.error.description'))
						.addFields({
							name: getMessage('misc.error.fields.identifier'),
							value: inlineCode(ref),
						}),
				],
			});
		}

		try {
			const status = getWorkingStatus(category.guild.workingHours, undefined, category.guild.holidays);
			const working = status.working;

			if (!working && status.timestamp) {
				const key = status.holiday ? 'holiday' : status.startsToday ? 'today' : 'next';
				channel.send({
					embeds: [
						new ExtendedEmbedBuilder()
							.setColor(category.guild.primaryColour)
							.setTitle(getMessage(`ticket.working_hours.${key}.title`))
							.setDescription(getMessage(`ticket.working_hours.${key}.description`, { timestamp: status.timestamp })),
					],
				}).catch(this.client.log.error);
			}

			if (working && process.env.PUBLIC_BOT !== 'true') {
				let online = 0;
				for (const [, member] of channel.members) {
					if (member.user.bot) continue;
					if (!await isStaff(channel.guild, member.id)) continue;
					if (member.presence && member.presence.status !== 'offline') online++;
				}
				if (online === 0) {
					channel.send({
						embeds: [
							new ExtendedEmbedBuilder()
								.setColor(category.guild.primaryColour)
								.setTitle(getMessage('ticket.offline.title'))
								.setDescription(getMessage('ticket.offline.description')),
						],
					}).catch(this.client.log.error);
					this.client.keyv.set(`offline/${channel.id}`, Date.now(), ms('1h'));
				}
			}
		} catch (error) {
			this.client.log.error(error);
		}
	}

	/**
	 * @param {import("discord.js").ChatInputCommandInteraction|import("discord.js").ButtonInteraction} interaction
	 */
	/**
	 * Reply (ephemerally) that a ticket is closed, or that the channel isn't a ticket.
	 * @param {import("discord.js").RepliableInteraction} interaction
	 * @param {object | null} ticket
	 * @param {string} [key] the misc.* message
	 */
	async replyError(interaction, ticket, key) {
		const settings = ticket?.guild ?? await this.client.prisma.guild.findUnique({ where: { id: interaction.guild.id } });
		const getMessage = this.client.i18n.getLocale(settings?.locale);
		const payload = {
			embeds: [
				new ExtendedEmbedBuilder({
					iconURL: interaction.guild.iconURL(),
					text: settings?.footer,
				})
					.setColor(settings?.errorColour ?? 'Red')
					.setTitle(getMessage(`misc.${key}.title`))
					.setDescription(getMessage(`misc.${key}.description`)),
			],
			flags: MessageFlags.Ephemeral,
		};
		if (interaction.deferred || interaction.replied) return await interaction.editReply(payload);
		return await interaction.reply(payload);
	}

	/**
	 * @param {import("discord.js").RepliableInteraction} interaction
	 * @param {object} ticket
	 */
	async replyClosed(interaction, ticket) {
		return await this.replyError(interaction, ticket, 'ticket_closed');
	}

	/**
	 * Whether a member is staff for a ticket's category (or can manage the server).
	 * @param {import("discord.js").GuildMember} member
	 * @param {object} category
	 * @returns {boolean}
	 */
	isCategoryStaff(member, category) {
		if (this.client.supers.includes(member.id)) return true;
		if (member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return true;
		return (category?.staffRoles ?? []).some(role => member.roles.cache.has(role));
	}

	/**
	 * The channel name for a ticket, from a template.
	 * @param {string} template
	 * @param {object} ticket with category
	 * @param {import("discord.js").Guild} guild
	 * @param {import("discord.js").User} [claimer]
	 * @returns {Promise<string>}
	 */
	async ticketChannelName(template, ticket, guild, claimer) {
		const creator = await guild.members.fetch(ticket.createdById).catch(() => null);
		return formatChannelName(template, {
			// a claimer's name in the channel name would reveal who is answering an anonymous ticket
			claimer: claimer && (ticket.category?.anonymous ? 'staff' : claimer.username),
			displayName: creator?.displayName ?? 'unknown',
			number: ticket.number,
			username: creator?.user.username ?? 'unknown',
		});
	}

	/**
	 * @param {import("discord.js").ChatInputCommandInteraction|import("discord.js").ButtonInteraction} interaction
	 */
	async claim(interaction) {
		const ticket = await this.client.prisma.ticket.findUnique({
			include: {
				_count: { select: { questionAnswers: true } },
				category: true,
				guild: true,
			},
			where: { id: interaction.channel.id },
		});
		if (!ticket) return await this.replyError(interaction, null, 'not_ticket');
		if (!ticket.open) return await this.replyClosed(interaction, ticket);
		const getMessage = this.client.i18n.getLocale(ticket.guild.locale);

		if (!(await isStaff(interaction.guild, interaction.user.id))) { // if user is not staff
			return await interaction.reply({
				embeds: [
					new ExtendedEmbedBuilder({
						iconURL: interaction.guild.iconURL(),
						text: ticket.guild.footer,
					})
						.setColor(ticket.guild.errorColour)
						.setTitle(getMessage('commands.slash.claim.not_staff.title'))
						.setDescription(getMessage('commands.slash.claim.not_staff.description')),
				],
				flags: MessageFlags.Ephemeral,
			});
		}

		const previous = ticket.claimedById;
		// a claimed ticket can only be taken over if the category allows it
		if (previous && (previous === interaction.user.id || !ticket.category.claimTakeover)) {
			return await interaction.reply({
				embeds: [
					new ExtendedEmbedBuilder()
						.setColor(ticket.guild.errorColour)
						.setDescription(getMessage('ticket.already_claimed', { user: ticket.category.anonymous && previous !== interaction.user.id ? getMessage('ticket.anonymous.staff') : `<@${previous}>` })),
				],
				flags: MessageFlags.Ephemeral,
			});
		}

		await interaction.deferReply();

		const reason = `Ticket claimed by ${interaction.user.tag}`;
		await Promise.all([
			interaction.channel.permissionOverwrites.edit(interaction.user, { 'ViewChannel': true }, { reason }),
			// the previous claimer (when taking over) loses their claim, and the access that came with it
			// (unless they opened the ticket, e.g. a staff member's own ticket)
			previous && previous !== ticket.createdById && interaction.channel.permissionOverwrites.delete(previous, reason).catch(() => null),
			// by default, a claimed ticket is hidden from the rest of the staff
			...(ticket.category.claimHide ? ticket.category.staffRoles : []).map(role => interaction.channel.permissionOverwrites.edit(role, { 'ViewChannel': false }, { reason })),
			this.client.prisma.ticket.update({
				data: {
					claimedBy: {
						connectOrCreate: {
							create: { id: interaction.user.id },
							where: { id: interaction.user.id },
						},
					},
				},
				where: { id: interaction.channel.id },
			}),
		]);

		const openingMessage = await interaction.channel.messages.fetch(ticket.openingMessageId).catch(() => null);

		if (openingMessage && openingMessage.components.length !== 0) {
			const categorySettings = resolveCategorySettings(ticket.guild, ticket.category);
			await editOpeningButtons(openingMessage, buildButtons({
				claim: categorySettings.claimButton && ticket.category.claiming ? 'unclaim' : null,
				close: categorySettings.closeButton,
				edit: Boolean(ticket.topic || ticket._count.questionAnswers !== 0),
				getMessage,
			}));
		}

		await interaction.editReply({
			embeds: [
				new ExtendedEmbedBuilder()
					.setColor(ticket.guild.primaryColour)
					.setDescription(getMessage('ticket.claimed', { user: ticket.category?.anonymous ? getMessage('ticket.anonymous.staff') : interaction.user.toString() })),
			],
		});

		// after replying: renames can be rate limited by Discord (2 per 10 minutes) and wait a long time
		await this.applyClaimedChannel(interaction.channel, ticket, interaction.user, reason);

		logTicketEvent(this.client, {
			action: 'claim',
			target: {
				id: ticket.id,
				name: interaction.channel.toString(),
			},
			userId: interaction.user.id,
		});
	}

	/**
	 * Rename and/or move a ticket's channel when it's claimed, or put it back when it's released.
	 * Failures (e.g. Discord's limit of 2 renames per 10 minutes) don't stop the claim.
	 * @param {import("discord.js").TextChannel} channel
	 * @param {object} ticket with category
	 * @param {import("discord.js").User | null} claimer null when released
	 * @param {string} reason
	 */
	async applyClaimedChannel(channel, ticket, claimer, reason) {
		const { category } = ticket;
		try {
			if (category.claimedChannelName) {
				const name = await this.ticketChannelName(claimer ? category.claimedChannelName : category.channelName, ticket, channel.guild, claimer);
				if (name && name !== channel.name) await channel.setName(name, reason);
			}
			if (category.claimedCategory) {
				let parent = null;
				if (claimer) {
					const target = channel.guild.channels.cache.get(category.claimedCategory); // only categories in this server
					if (target?.type === ChannelType.GuildCategory && target.children.cache.size < 50) parent = target.id;
				} else if (channel.parentId === category.claimedCategory) {
					parent = this.pickDiscordCategory(channel.guild, category);
				}
				if (parent && parent !== channel.parentId) {
					await channel.setParent(parent, {
						lockPermissions: false,
						reason,
					});
				}
			}
		} catch (error) {
			this.client.log.warn(`Failed to update the channel of ticket ${ticket.id} after it was ${claimer ? 'claimed' : 'released'}`, error);
		}
	}

	/**
	 * @param {import("discord.js").ChatInputCommandInteraction|import("discord.js").ButtonInteraction} interaction
	 */
	async release(interaction) {
		const ticket = await this.client.prisma.ticket.findUnique({
			include: {
				_count: { select: { questionAnswers: true } },
				category: true,
				guild: true,
			},
			where: { id: interaction.channel.id },
		});
		if (!ticket) return await this.replyError(interaction, null, 'not_ticket');
		if (!ticket.open) return await this.replyClosed(interaction, ticket);
		const getMessage = this.client.i18n.getLocale(ticket.guild.locale);

		if (!(await isStaff(interaction.guild, interaction.user.id))) { // if user is not staff
			return await interaction.reply({
				embeds: [
					new ExtendedEmbedBuilder({
						iconURL: interaction.guild.iconURL(),
						text: ticket.guild.footer,
					})
						.setColor(ticket.guild.errorColour)
						.setTitle(getMessage('commands.slash.claim.not_staff.title'))
						.setDescription(getMessage('commands.slash.claim.not_staff.description')),
				],
				flags: MessageFlags.Ephemeral,
			});
		}

		const claimer = ticket.claimedById;
		const canOverride = this.client.supers.includes(interaction.user.id) || interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild);
		if (ticket.category.claimReleaseLocked && claimer && claimer !== interaction.user.id && !canOverride) {
			return await interaction.reply({
				embeds: [
					new ExtendedEmbedBuilder()
						.setColor(ticket.guild.errorColour)
						.setDescription(getMessage('ticket.release_locked', { user: ticket.category.anonymous ? getMessage('ticket.anonymous.staff') : `<@${claimer}>` })),
				],
				flags: MessageFlags.Ephemeral,
			});
		}

		await interaction.deferReply();

		const reason = `Ticket released by ${interaction.user.tag}`;
		await Promise.all([
			// remove the claimer's access (it used to remove the access of whoever released it, even if they weren't the
			// claimer), but never the creator's, who may be staff and have claimed their own ticket
			claimer && claimer !== ticket.createdById && interaction.channel.permissionOverwrites.delete(claimer, reason).catch(() => null),
			...ticket.category.staffRoles.map(role => interaction.channel.permissionOverwrites.edit(role, { 'ViewChannel': true }, { reason })),
			this.client.prisma.ticket.update({
				data: { claimedBy: { disconnect: true } },
				where: { id: interaction.channel.id },
			}),
		]);

		const openingMessage = await interaction.channel.messages.fetch(ticket.openingMessageId).catch(() => null);

		if (openingMessage && openingMessage.components.length !== 0) {
			const categorySettings = resolveCategorySettings(ticket.guild, ticket.category);
			await editOpeningButtons(openingMessage, buildButtons({
				claim: categorySettings.claimButton && ticket.category.claiming ? 'claim' : null,
				close: categorySettings.closeButton,
				edit: Boolean(ticket.topic || ticket._count.questionAnswers !== 0),
				getMessage,
			}));
		}

		await interaction.editReply({
			embeds: [
				new ExtendedEmbedBuilder()
					.setColor(ticket.guild.primaryColour)
					.setDescription(getMessage('ticket.released', { user: ticket.category?.anonymous ? getMessage('ticket.anonymous.staff') : interaction.user.toString() })),
			],
		});

		// after replying: renames can be rate limited by Discord (2 per 10 minutes) and wait a long time
		if (claimer) await this.applyClaimedChannel(interaction.channel, ticket, null, reason);

		logTicketEvent(this.client, {
			action: 'unclaim',
			target: {
				id: ticket.id,
				name: interaction.channel.toString(),
			},
			userId: interaction.user.id,
		});
	}

	/**
	 * Load a closed ticket in a kept channel for /reopen and the Reopen and Delete buttons, and check the member is
	 * staff for its category. Replies and returns null if not.
	 * @param {import("discord.js").ChatInputCommandInteraction|import("discord.js").ButtonInteraction} interaction
	 */
	async getClosedTicketFor(interaction) {
		const ticket = await this.client.prisma.ticket.findUnique({
			include: {
				category: true,
				guild: true,
			},
			where: { id: interaction.channel.id },
		});
		if (!ticket || ticket.guildId !== interaction.guild.id) {
			await this.replyError(interaction, null, 'not_ticket');
			return null;
		}
		if (!this.isCategoryStaff(interaction.member, ticket.category)) {
			await this.replyError(interaction, ticket, 'staff_only');
			return null;
		}
		if (ticket.open) {
			await this.replyError(interaction, ticket, 'ticket_open');
			return null;
		}
		return ticket;
	}

	/**
	 * Reopen a closed ticket whose channel was kept.
	 * @param {import("discord.js").ChatInputCommandInteraction|import("discord.js").ButtonInteraction} interaction
	 */
	async reopen(interaction) {
		const ticket = await this.getClosedTicketFor(interaction);
		if (!ticket) return;
		const getMessage = this.client.i18n.getLocale(ticket.guild.locale);
		await interaction.deferReply();

		await this.client.prisma.ticket.update({
			data: {
				channelDeleteAt: null,
				closedAt: null,
				closedBy: ticket.closedById ? { disconnect: true } : undefined,
				closedReason: null,
				lastMessageAt: new Date(), // so it isn't immediately stale again
				open: true,
			},
			where: { id: ticket.id },
		});
		await this.getTicket(ticket.id, true);
		this.$count.categories[ticket.categoryId] = {}; // recount the open tickets

		await unlockChannel(interaction.channel, ticket.createdById, `Ticket reopened by ${interaction.user.tag}`);

		// the buttons on the "ticket closed" message no longer apply
		if (interaction.isButton?.()) await interaction.message?.edit({ components: [] }).catch(() => null);

		await interaction.editReply({
			embeds: [
				new ExtendedEmbedBuilder()
					.setColor(ticket.guild.successColour)
					.setDescription(getMessage('ticket.reopened', { user: ticket.category?.anonymous ? getMessage('ticket.anonymous.staff') : interaction.user.toString() })),
			],
		});

		logTicketEvent(this.client, {
			action: 'reopen',
			target: {
				id: ticket.id,
				name: interaction.channel.toString(),
			},
			userId: interaction.user.id,
		});
	}

	/**
	 * Delete the kept channel of a closed ticket. The ticket and its archive stay in the database.
	 * @param {import("discord.js").ChatInputCommandInteraction|import("discord.js").ButtonInteraction} interaction
	 */
	async deleteClosed(interaction) {
		const ticket = await this.getClosedTicketFor(interaction);
		if (!ticket) return;
		const getMessage = this.client.i18n.getLocale(ticket.guild.locale);
		await interaction.reply({
			embeds: [
				new ExtendedEmbedBuilder()
					.setColor(ticket.guild.errorColour)
					.setDescription(getMessage('ticket.deleting')),
			],
		});
		if (interaction.isButton?.()) await interaction.message?.edit({ components: [] }).catch(() => null);
		await this.client.prisma.ticket.update({
			data: { channelDeleteAt: null },
			where: { id: ticket.id },
		});
		await logTicketEvent(this.client, {
			action: 'delete',
			target: {
				id: ticket.id,
				name: `${ticket.category?.name} **#${ticket.number}**`,
			},
			userId: interaction.user.id,
		}).catch(error => this.client.log.error(error));
		await new Promise(resolve => setTimeout(resolve, this.closeDelay));
		if (interaction.channel.deletable) await interaction.channel.delete(`Closed ticket deleted by ${interaction.user.tag}`);
	}

	buildFeedbackModal(locale, id) {
		const getMessage = this.client.i18n.getLocale(locale);
		return new ModalBuilder()
			.setCustomId(JSON.stringify({
				action: 'feedback',
				...id,
			}))
			.setTitle(getMessage('modals.feedback.title'))
			.setComponents(
				new ActionRowBuilder()
					.setComponents(
						new TextInputBuilder()
							.setCustomId('rating')
							.setLabel(getMessage('modals.feedback.rating.label'))
							.setStyle(TextInputStyle.Short)
							.setMaxLength(3)
							.setMinLength(1)
							.setPlaceholder(getMessage('modals.feedback.rating.placeholder'))
							.setRequired(true),
					),
				new ActionRowBuilder()
					.setComponents(
						new TextInputBuilder()
							.setCustomId('comment')
							.setLabel(getMessage('modals.feedback.comment.label'))
							.setStyle(TextInputStyle.Paragraph)
							.setMaxLength(1000)
							.setMinLength(4)
							.setPlaceholder(getMessage('modals.feedback.comment.placeholder'))
							.setRequired(false),
					),
			);
	}


	/**
	 * @param {import("discord.js").ChatInputCommandInteraction|import("discord.js").ButtonInteraction} interaction
	 */
	async beforeRequestClose(interaction) {
		const ticket = await this.getTicket(interaction.channel.id);
		if (!ticket) {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const {
				errorColour,
				footer,
				locale,
			} = await this.client.prisma.guild.findUnique({
				select: {
					errorColour: true,
					locale: true,
				},
				where: { id: interaction.guild.id },
			});
			const getMessage = this.client.i18n.getLocale(locale);
			return await interaction.editReply({
				embeds: [
					new ExtendedEmbedBuilder({
						iconURL: interaction.guild.iconURL(),
						text: footer,
					})
						.setColor(errorColour)
						.setTitle(getMessage('misc.not_ticket.title'))
						.setDescription(getMessage('misc.not_ticket.description')),
				],
			});
		}

		const getMessage = this.client.i18n.getLocale(ticket.guild.locale);
		if (!ticket.open) return await this.replyClosed(interaction, ticket);
		const staff = await isStaff(interaction.guild, interaction.user.id);
		const reason = interaction.options?.getString('reason', false) || null; // ?. because it could be a button interaction

		if (ticket.createdById !== interaction.user.id && !staff) {
			// the interaction hasn't been deferred yet, so editReply would throw
			return await interaction.reply({
				embeds: [
					new ExtendedEmbedBuilder()
						.setColor(ticket.guild.errorColour)
						.setTitle(getMessage('ticket.close.forbidden.title'))
						.setDescription(getMessage('ticket.close.forbidden.description')),
				],
				flags: MessageFlags.Ephemeral,
			});
		}

		if (
			ticket.createdById === interaction.user.id &&
			ticket.category.enableFeedback &&
			!ticket.feedback
		) {
			return await interaction.showModal(this.buildFeedbackModal(ticket.guild.locale, {
				next: 'requestClose',
				reason, // known issue: a reason longer than a few words will cause an error due to 100 character custom_id limit
			}));
		}

		// not showing feedback, so send the close request

		// defer asap
		await interaction.deferReply();

		// if the creator isn't in the guild , close the ticket immediately
		// (although leaving should cause the ticket to be closed anyway)
		try {
			await interaction.guild.members.fetch(ticket.createdById);
		} catch {
			return this.finallyClose(ticket.id, { reason });
		}

		return await this.requestClose(interaction, reason);
	}

	/**
	 * @param {import("discord.js").ChatInputCommandInteraction
	 * | import("discord.js").ButtonInteraction
	 * | import("discord.js").ModalSubmitInteraction} interaction
	 * @param {string} reason
	 */
	async requestClose(interaction, reason) {
		// interaction could be command, button. or modal
		const ticket = await this.getTicket(interaction.channel.id);
		const getMessage = this.client.i18n.getLocale(ticket.guild.locale);

		// close requests can be turned off, so the creator or staff close the ticket straight away (upstream #406)
		if (ticket.guild.closeRequests === false) {
			return await this.acceptClose(interaction, {
				closedBy: interaction.user.id,
				reason,
			});
		}

		const staff = interaction.user.id !== ticket.createdById && await isStaff(interaction.guild, interaction.user.id);
		const closeButtonId = {
			action: 'close',
			expect: staff ? 'user' : 'staff',
		};
		// in anonymous tickets, staff are named "Staff"
		const hideStaff = staff && ticket.category?.anonymous;
		const embed = new ExtendedEmbedBuilder(/* {
			iconURL: interaction.guild.iconURL(),
			text: ticket.guild.footer,
		} */)
			.setColor(ticket.guild.primaryColour)
			.setTitle(getMessage(`ticket.close.${staff ? 'staff' : 'user'}_request.title`, { requestedBy: hideStaff ? getMessage('ticket.anonymous.staff') : interaction.member.displayName }));

		if (staff) {
			embed.setDescription(
				getMessage('ticket.close.staff_request.description', { requestedBy: hideStaff ? getMessage('ticket.anonymous.staff') : interaction.user.toString() }) +
				(resolveCategorySettings(ticket.guild, ticket.category).archive ? getMessage('ticket.close.staff_request.archived') : ''),
			);
		}

		const sent = await interaction.editReply({
			components: [
				new ActionRowBuilder()
					.addComponents(
						new ButtonBuilder()
							.setCustomId(JSON.stringify({
								accepted: true,
								...closeButtonId,
							}))
							.setStyle(ButtonStyle.Success)
							.setEmoji(buttonEmoji(getMessage, 'accept_close_request'))
							.setLabel(getMessage('buttons.accept_close_request.text')),
						new ButtonBuilder()
							.setCustomId(JSON.stringify({
								accepted: false,
								...closeButtonId,
							}))
							.setStyle(ButtonStyle.Danger)
							.setEmoji(buttonEmoji(getMessage, 'reject_close_request'))
							.setLabel(getMessage('buttons.reject_close_request.text')),
					),
			],
			content: staff ? `<@${ticket.createdById}>` : '', // ticket.category.pingRoles.map(r => `<@&${r}>`).join(' ')
			embeds: [embed],
		});

		const { autoClose } = resolveCategorySettings(ticket.guild, ticket.category);
		this.$stale.set(ticket.id, {
			closeAt: autoClose ? Date.now() + autoClose : null,
			closedBy: interaction.user.id, // null if set as stale due to inactivity
			message: sent,
			messages: 0,
			reason,
			staleSince: Date.now(),
		});

		if (ticket.priority && ticket.priority !== 'LOW') {
			await this.client.prisma.ticket.update({
				data: { priority: 'LOW' },
				where: { id: ticket.id },
			});
		}
	}

	/**
	 * @param {import("discord.js").ChatInputCommandInteraction
	 * | import("discord.js").ButtonInteraction
	 * | import("discord.js").ModalSubmitInteraction} interaction
	 * @param {{ closedBy?: string, reason?: string }} [options] used instead of the close request's details
	 */
	async acceptClose(interaction, options) {
		const ticket = await this.getTicket(interaction.channel.id);
		const getMessage = this.client.i18n.getLocale(ticket.guild.locale);
		await interaction.editReply({
			embeds: [
				new ExtendedEmbedBuilder({
					iconURL: interaction.guild.iconURL(),
					text: ticket.guild.footer,
				})
					.setColor(ticket.guild.successColour)
					.setTitle(getMessage('ticket.close.closed.title'))
					.setDescription(getMessage(keepsClosedChannels(ticket.category) ? 'ticket.close.closed.description_kept' : 'ticket.close.closed.description')),
			],
		});
		await new Promise(resolve => setTimeout(resolve, this.closeDelay));
		await this.finallyClose(interaction.channel.id, options ?? this.$stale.get(interaction.channel.id) ?? {});
	}

	/**
	 * close a ticket
	 * @param {string} ticketId
	 */
	async finallyClose(ticketId, {
		closedBy = null,
		reason = null,
	}) {
		let ticket = await this.getTicket(ticketId, true);
		if (!ticket?.open) return; // already closed (e.g. a close request accepted twice)
		const getMessage = this.client.i18n.getLocale(ticket.guild.locale);

		const { _count: { archivedMessages } } = await this.client.prisma.ticket.findUnique({
			select: { _count: { select: { archivedMessages: true } } },
			where: { id: ticket.id },
		});

		/** @type {import("@prisma/client").Ticket} */
		const data = {
			closedAt: new Date(),
			closedBy: closedBy && {
				connectOrCreate: {
					create: { id: closedBy },
					where: { id: closedBy },
				},
			} || undefined, // Prisma wants undefined not null because it is a relation
			closedReason: reason && await crypto.queue(w => w.encrypt(reason)),
			messageCount: archivedMessages,
			open: false,
		};

		/** @type {import("discord.js").TextChannel} */
		const channel = this.client.channels.cache.get(ticketId);
		if (channel) {
			const pinned = await channel.messages.fetchPinned();
			data.pinnedMessageIds = [...pinned.keys()];
		}

		// some categories keep the channel after closing (until it's deleted, or for a while)
		const keep = Boolean(channel) && keepsClosedChannels(ticket.category);
		data.channelDeleteAt = keep ? getChannelDeleteAt(data.closedAt, ticket.category.keepClosedFor) : null;

		try {
			ticket = await this.client.prisma.ticket.update({
				data,
				include: {
					category: true,
					feedback: true,
					guild: true,
				},
				where: { id: ticket.id },
			});
			if (this.$stale.has(ticketId)) this.$stale.delete(ticketId);
			await this.getTicket(ticketId, true); // update the cache so the ticket is seen as closed
			getPortalEvents(this.client).emit('ticket-closed', { ticketId });
			this.$count.categories[ticket.categoryId] ??= {};
			this.$count.categories[ticket.categoryId].total -= 1;
			this.$count.categories[ticket.categoryId][ticket.createdById] -= 1;
		} catch (error) {
			this.client.log.error(error);
			return;
		}

		const guild = this.client.guilds.cache.get(ticket.guildId);
		const categorySettings = resolveCategorySettings(ticket.guild, ticket.category);
		const closerMember = closedBy ? guild?.members.cache.get(closedBy) : null;
		// the parentheses matter: without them the audit log reason was always ": <reason>" (or ": null")
		const auditReason = 'Ticket closed' + (closerMember ? ` by ${closerMember.displayName}` : '') + (reason ? `: ${reason}` : '');
		// in anonymous tickets the creator (and the transcript channel) isn't told which staff member closed it
		const closerName = !ticket.closedById
			? this.client.user.toString()
			: ticket.category?.anonymous && ticket.closedById !== ticket.createdById
				? getMessage('ticket.anonymous.staff')
				: `<@${ticket.closedById}>`;

		if (keep) {
			try {
				await lockChannel(channel, auditReason);
				const embed = new ExtendedEmbedBuilder({
					iconURL: guild.iconURL(),
					text: ticket.guild.footer,
				})
					.setColor(ticket.guild.primaryColour)
					.setTitle(getMessage('ticket.closed_kept.title'))
					.setDescription(
						getMessage('ticket.closed_kept.description', { user: closerName }) +
						(ticket.channelDeleteAt ? '\n' + getMessage('ticket.closed_kept.delete_at', { timestamp: Math.floor(ticket.channelDeleteAt / 1000) }) : ''),
					);
				if (reason) {
					embed.addFields({
						name: getMessage('dm.closed.fields.reason'),
						value: reason,
					});
				}
				await channel.send({
					components: [buildClosedControls(getMessage, {
						ticketId: ticket.id,
						transcript: categorySettings.archive,
					})],
					embeds: [embed],
				});
			} catch (error) {
				// never leave the creator with access to a closed ticket: if it can't be locked, delete it as before
				this.client.log.error(`Failed to lock the channel of closed ticket ${ticket.id}; deleting it instead`, error);
				await this.client.prisma.ticket.update({
					data: { channelDeleteAt: null },
					where: { id: ticket.id },
				}).catch(e => this.client.log.error(e));
				if (channel.deletable) await channel.delete(auditReason).catch(e => this.client.log.error(e));
			}
		} else if (channel?.deletable) {
			await channel.delete(auditReason);
		}

		// HTML transcripts for the transcript channel and/or the closed DM
		const targets = transcriptTargets(categorySettings, ticket.guild);
		let transcriptFile = null;
		if (targets.channel || targets.dm) {
			try {
				transcriptFile = await buildTranscriptAttachment(this.client, ticket.id);
			} catch (error) {
				this.client.log.error(`Failed to create the transcript of ticket ${ticket.id}`, error);
			}
		}
		if (transcriptFile && targets.channel) {
			const transcriptChannel = guildChannel(this.client, ticket.guildId, ticket.guild.transcriptChannel);
			await transcriptChannel?.send({
				allowedMentions: { parse: [] },
				content: getMessage('ticket.transcript_saved', {
					ticket: `${ticket.category.name} **#${ticket.number}**`,
					user: closerName,
				}),
				files: [transcriptFile],
			}).catch(error => this.client.log.warn(`Failed to post the transcript of ticket ${ticket.id}`, error));
		}

		const components = [];

		if (categorySettings.archive) {
			components.push(
				new ActionRowBuilder()
					.addComponents(
						new ButtonBuilder()
							.setCustomId(JSON.stringify({
								action: 'transcript',
								ticket: ticket.id,
							}))
							.setStyle(ButtonStyle.Primary)
							.setEmoji(buttonEmoji(getMessage, 'transcript'))
							.setLabel(getMessage('buttons.transcript.text')),

					),
			);
		}

		const fields = {
			closed: {
				inline: true,
				name: getMessage('dm.closed.fields.closed.name'),
				value: getMessage('dm.closed.fields.closed.value', {
					duration: ms(ticket.closedAt - ticket.createdAt, { long: true }),
					timestamp: `<t:${Math.floor(ticket.closedAt / 1000)}:f>`,
				}),
			},
			closedById: ticket.closedById && {
				inline: true,
				name: getMessage('dm.closed.fields.closed_by'),
				value: closerName,
			},
			created: {
				inline: true,
				name: getMessage('dm.closed.fields.created'),
				value: `<t:${Math.floor(ticket.createdAt / 1000)}:f>`,
			},
			feedback: ticket.feedback && {
				inline: true,
				name: getMessage('dm.closed.fields.feedback'),
				value: Array(ticket.feedback.rating).fill('⭐').join(' ') + ` (${ticket.feedback.rating}/5)`,
			},
			firstResponseAt: ticket.firstResponseAt && {
				inline: true,
				name: getMessage('dm.closed.fields.response'),
				value: ms(ticket.firstResponseAt - ticket.createdAt, { long: true }),
			},
			reason: reason && {
				inline: true,
				name: getMessage('dm.closed.fields.reason'),
				value: reason,
			},
			ticket: {
				inline: true,
				name: getMessage('dm.closed.fields.ticket'),
				value: `${ticket.category.name} **#${ticket.number}**`,
			},
			topic: ticket.topic && {
				inline: true,
				name: getMessage('dm.closed.fields.topic'),
				value: await crypto.queue(w => w.decrypt(ticket.topic)),
			},
		};

		const dmEmbed = new ExtendedEmbedBuilder({
			iconURL: guild.iconURL(),
			text: ticket.guild.footer,
		})
			.setColor(ticket.guild.primaryColour)
			.setTitle(getMessage('dm.closed.title'));

		dmEmbed.addFields(fields.ticket);
		if (ticket.topic) dmEmbed.addFields(fields.topic);
		dmEmbed.addFields(fields.created, fields.closed);
		if (ticket.firstResponseAt) dmEmbed.addFields(fields.firstResponseAt);
		if (ticket.feedback) dmEmbed.addFields(fields.feedback);
		if (ticket.closedById) dmEmbed.addFields(fields.closedById);
		if (reason) dmEmbed.addFields(fields.reason);

		try {
			const creator = guild.members.cache.get(ticket.createdById);
			if (creator) {
				const dm = {
					components,
					embeds: [dmEmbed],
				};
				if (transcriptFile && targets.dm) {
					// a transcript can be too big to attach; the DM is still sent without it
					await creator.send({
						...dm,
						files: [transcriptFile],
					}).catch(async error => {
						this.client.log.warn(`Failed to send the transcript of ticket ${ticket.id} by DM`, error);
						await creator.send(dm);
					});
				} else {
					await creator.send(dm);
				}
			}
		} catch (error) {
			this.client.log.error(error);
		}

		const fieldsArray = [];
		if (ticket.topic) fieldsArray.push(fields.topic);
		fieldsArray.push(fields.created, fields.closed);
		if (ticket.firstResponseAt) fieldsArray.push(fields.firstResponseAt);
		if (fields.feedback) {
			fieldsArray.push(
				{
					...fields.feedback,
					inline: true,
					name: getMessage('modals.feedback.rating.label'),
				},
				{
					inline: true,
					name: getMessage('modals.feedback.comment.label'),
					value: (ticket.feedback.comment && await crypto.queue(w => w.decrypt(ticket.feedback.comment))) || getMessage('ticket.answers.no_value'),
				});
		}
		if (reason) fieldsArray.push(fields.reason);

		increment('tickets_closed_total');
		sendTicketWebhook(this.client, 'ticket.closed', ticket.id);
		logTicketEvent(this.client, {
			action: 'close',
			payload: {
				components,
				fields: fieldsArray,
			},
			target: {
				id: ticket.id,
				name: `${ticket.category.name} **#${ticket.number}**`,
			},
			userId: closedBy || this.client.user.id,
		});

	}
};
