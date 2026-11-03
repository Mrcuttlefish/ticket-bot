const { Listener } = require('@eartharoid/dbf');
const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle: { Success },
	ChannelType,
	ComponentType,
	EmbedBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} = require('discord.js');
const {
	getCommonGuilds,
	isStaff,
} = require('../../lib/users');
const ms = require('ms');
const { handleGhostPing } = require('../../lib/tickets/ghost-ping');
const {
	isRelay, isWebReply, relayMessage, shouldRelay,
} = require('../../lib/tickets/anonymous');
const { resolveCategorySettings } = require('../../lib/tickets/options');
const { compileTagRegex } = require('../../lib/security');
const {
	fillTagPlaceholders, getGuildTags,
} = require('../../lib/tags');
const emoji = require('node-emoji');
const { buttonEmoji } = require('../../lib/icons');

module.exports = class extends Listener {
	constructor(client, options) {
		super(client, {
			...options,
			emitter: client,
			event: 'messageCreate',
		});
	}

	/**
 	 * @param {import('@prisma/client').Guild} settings
	 * @param {import("discord.js").ButtonInteraction|import("discord.js").SelectMenuInteraction} interaction
	 */
	async useGuild(settings, interaction, topic) {
		const getMessage = this.client.i18n.getLocale(settings.locale);
		if (settings.categories.length === 0) {
			interaction.update({
				components: [],
				embeds: [
					new EmbedBuilder()
						.setColor(settings.errorColour)
						.setTitle(getMessage('misc.no_categories.title'))
						.setDescription(getMessage('misc.no_categories.description', { url: `${process.env.HTTP_EXTERNAL}/settings/${interaction.guildId}` })),
				],
			});
		} else if (settings.categories.length === 1) {
			await this.client.tickets.create({
				categoryId: settings.categories[0].id,
				interaction,
				topic,
			});
		} else {
			await interaction.update({
				components: [
					new ActionRowBuilder()
						.setComponents(
							new StringSelectMenuBuilder()
								.setCustomId(JSON.stringify({
									action: 'create',
									topic,
								}))
								.setPlaceholder(getMessage('menus.category.placeholder'))
								.setOptions(
									settings.categories.map(category =>
										new StringSelectMenuOptionBuilder()
											.setValue(String(category.id))
											.setLabel(category.name)
											.setDescription(category.description)
											.setEmoji(emoji.hasEmoji(category.emoji) ? emoji.get(category.emoji) : { id: category.emoji }),
									),
								),
						),
				],
			});
			interaction.message.awaitMessageComponent({
				componentType: ComponentType.SelectMenu,
				filter: () => true,
				time: ms('30s'),
			})
				.then(async () => {
					interaction.message.delete();
				})
				.catch(error => {
					if (error) this.client.log.error(error);
					interaction.message.delete();
				});
		}

	}

	/**
	 * @param {import("discord.js").Message} message
	 */
	async run(message) {
		/** @type {import("client")} */
		const client = this.client;

		if (message.channel.type === ChannelType.DM) {
			if (message.author.bot) return false;
			const commonGuilds = await getCommonGuilds(client, message.author.id);
			if (commonGuilds.size === 0) {
				return false;
			} else if (commonGuilds.size === 1) {
				const settings = await client.prisma.guild.findUnique({
					select: {
						categories: true,
						errorColour: true,
						locale: true,
						primaryColour: true,
					},
					where: { id: commonGuilds.at(0).id },
				});
				const getMessage = client.i18n.getLocale(settings.locale);
				const sent = await message.reply({
					components: [
						new ActionRowBuilder()
							.setComponents(
								new ButtonBuilder()
									.setCustomId(message.id)
									.setStyle(Success)
									.setLabel(getMessage('buttons.confirm_open.text'))
									.setEmoji(buttonEmoji(getMessage, 'confirm_open')),
							),
					],
					embeds: [
						new EmbedBuilder()
							.setColor(settings.primaryColour)
							.setTitle(getMessage('dm.confirm_open.title'))
							.setDescription(message.content),
					],
				});
				sent.awaitMessageComponent({
					componentType: ComponentType.Button,
					filter: () => true,
					time: ms('30s'),
				})
					.then(async interaction => await this.useGuild(settings, interaction, message.content))
					.catch(error => {
						if (error) client.log.error(error);
						sent.delete();
					});
			} else {
				const getMessage = client.i18n.getLocale();
				const sent = await message.reply({
					components: [
						new ActionRowBuilder()
							.setComponents(
								new StringSelectMenuBuilder()
									.setCustomId(message.id)
									.setPlaceholder(getMessage('menus.guild.placeholder'))
									.setOptions(
										commonGuilds.map(g =>
											new StringSelectMenuOptionBuilder()
												.setValue(String(g.id))
												.setLabel(g.name),
										),
									),
							),

					],
				});
				sent.awaitMessageComponent({
					componentType: ComponentType.SelectMenu,
					filter: () => true,
					time: ms('30s'),
				})
					.then(async interaction => {
						const settings = await client.prisma.guild.findUnique({
							select: {
								categories: true,
								errorColour: true,
								locale: true,
								primaryColour: true,
							},
							where: { id: interaction.values[0] },
						});
						await this.useGuild(settings, interaction, message.content);
					})
					.catch(error => {
						if (error) client.log.error(error);
						sent.delete();
					});
			}
		} else {
			const settings = await client.prisma.guild.findUnique({ where: { id: message.guild.id } });
			if (!settings) return;
			const getMessage = client.i18n.getLocale(settings.locale);
			let ticket = await client.prisma.ticket.findUnique({
				include: { category: true },
				where: { id: message.channel.id },
			});

			if (ticket) {
				// archive messages (categories can override the archive setting, upstream #536)
				// relays of anonymous staff messages aren't archived (the original was archived with its real author), and
				// neither are portal replies (the route archives them with their real author)
				if (resolveCategorySettings(settings, ticket.category).archive && !isRelay(message, client.user.id) && !isWebReply(message, client.user.id)) {
					client.tickets.archiver.saveMessage(ticket.id, message)
						.catch(error => {
							client.log.warn('Failed to archive message', message.id);
							client.log.error(error);
							message.react('❌').catch(client.log.error);
						});
				}

				if (!message.author.bot) {
					// update user's message count
					client.prisma.user.upsert({
						create: {
							id: message.author.id,
							messageCount: 1,
						},
						update: { messageCount: { increment: 1 } },
						where: { id: message.author.id },
					}).catch(client.log.error);

					// set first and last message timestamps
					const staff = await isStaff(message.guild, message.author.id);
					const data = { lastMessageAt: new Date() };
					if (ticket.firstResponseAt === null && staff) data.firstResponseAt = new Date();

					handleGhostPing(client, message, ticket, settings, staff).catch(client.log.error);
					if (shouldRelay({
						message,
						staff,
						ticket,
					})) {
						relayMessage(client, message, settings, getMessage).catch(error => {
							client.log.warn('Failed to relay anonymous message', message.id);
							client.log.error(error);
						});
					}
					ticket = await client.prisma.ticket.update({
						data,
						where: { id: ticket.id },
					});

					// if the ticket was set as stale, unset it
					if (client.tickets.$stale.has(ticket.id)) {
						const $ticket = client.tickets.$stale.get(ticket.id);
						$ticket.messages++;
						if ($ticket.messages >= 1) {
							if ($ticket.message) await message.channel.messages.delete($ticket.message.id).catch(() => null);
							client.tickets.$stale.delete(ticket.id);
						} else {
							client.tickets.$stale.set(ticket.id, $ticket);
						}
					}
				}

				if (process.env.PUBLIC_BOT !== 'true' &&
					!message.author.bot &&
					!await isStaff(message.channel.guild, message.author.id)
				) {
					const key = `offline/${message.channel.id}`;
					let online = 0;
					for (const [, member] of message.channel.members) {
						if (member.user.bot) continue;
						if (!await isStaff(message.channel.guild, member.id)) continue;
						if (member.presence && member.presence.status !== 'offline') online++;
					}
					if (online === 0 && ! await client.keyv.has(key)) {
						await message.channel.send({
							embeds: [
								new EmbedBuilder()
									.setColor(settings.primaryColour)
									.setTitle(getMessage('ticket.offline.title'))
									.setDescription(getMessage('ticket.offline.description')),
							],
						});
						client.keyv.set(key, Date.now(), ms('1h'));
					}
				}
			}

			// auto-tag
			if (
				!message.author.bot &&
				(
					(settings.autoTag === 'all') ||
					(settings.autoTag === 'ticket' && ticket) ||
					(settings.autoTag === '!ticket' && !ticket) ||
					(settings.autoTag.includes(message.channel.id))
				)
			) {
				const tags = await getGuildTags(client, message.guild.id);

				// patterns are validated when saved, but older ones may be invalid or unsafe; compileTagRegex skips those
				const tag = tags.find(tag => compileTagRegex(tag.regex)?.test(message.content));
				if (tag) {
					await message.reply({
						embeds: [
							new EmbedBuilder()
								.setColor(settings.primaryColour)
								.setDescription(fillTagPlaceholders(tag.content, {
									author: message.author,
									channel: message.channel,
									guild: message.guild,
									ticket: ticket && {
										createdById: ticket.createdById,
										number: ticket.number,
									},
									user: message.member ?? message.author,
								})),
						],
					});
				}

			}
		}
	}
};
