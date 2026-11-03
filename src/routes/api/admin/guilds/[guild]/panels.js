const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle: {
		Primary,
		Secondary,
	},
	ChannelType: { GuildText },
	EmbedBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} = require('discord.js');
const emoji = require('node-emoji');
const { logAdminEvent } = require('../../../../../lib/logging');

module.exports.post = fastify => ({
	handler: async (req, res) => {
		/** @type {import('client')} */
		const client = req.routeOptions.config.client;
		const guild = client.guilds.cache.get(req.params.guild);
		const data = req.body;

		const settings = await client.prisma.guild.findUnique({
			select: {
				categories: true,
				footer: true,
				locale: true,
				primaryColour: true,
			},
			where: { id: guild.id },
		});
		const getMessage = client.i18n.getLocale(settings.locale);
		if (!Array.isArray(data.categories)) throw new Error('No categories');
		const categories = data.categories.map(id => {
			const category = settings.categories.find(c => c.id === id);
			if (!category) throw new Error(`Invalid category: ${id}`);
			return category;
		});
		if (categories.length === 0) throw new Error('No categories');
		if (categories.length !== 1 && data.type === 'MESSAGE') throw new Error('Invalid number of categories for panel type');

		/** @type {import("discord.js").TextChannel} */
		let channel;
		if (data.channel) {
			// the channel must be in this guild, otherwise admins of one guild could post into another
			channel = guild.channels.cache.get(String(data.channel));
			if (!channel || !channel.isTextBased()) {
				return res.code(400).send({
					error: 'Bad Request',
					message: 'The panel channel must be a text channel in this server.',
					statusCode: 400,
				});
			}
		} else {
			const allow = ['ViewChannel', 'ReadMessageHistory'];
			if (data.type === 'MESSAGE') allow.push('SendMessages');
			channel = await guild.channels.create({
				name: 'create-a-ticket',
				permissionOverwrites: [
					{
						allow,
						deny: ['AddReactions', 'AttachFiles'],
						id: guild.roles.everyone,
					},
				],
				position: 1,
				rateLimitPerUser: 15,
				reason: 'New ticket panel',
				type: GuildText,
			});
		}

		// editable panels (upstream #362): pass `message` (the ID of an existing panel in `channel`) to update it in place
		let existing = null;
		if (data.message) {
			if (!data.channel) throw new Error('`message` requires `channel`');
			const messageId = String(data.message).split('/').pop(); // accept an ID or a message link
			existing = await channel.messages.fetch(messageId).catch(() => null);
			if (!existing || existing.author.id !== client.user.id) {
				return res.code(400).send({
					error: 'Bad Request',
					message: 'The message to edit must be a panel sent by the bot in the selected channel.',
					statusCode: 400,
				});
			}
		}
		const publish = payload => (existing ? existing.edit({
			components: [],
			...payload,
		}) : channel.send(payload));

		const embed = new EmbedBuilder()
			.setColor(settings.primaryColour);

		if (settings.footer) {
			embed.setFooter({
				iconURL: guild.iconURL(),
				text: settings.footer,
			});
		}

		if (data.title) embed.setTitle(data.title);
		if (data.description) embed.setDescription(data.description);
		if (data.image) embed.setImage(data.image);
		if (data.thumbnail) embed.setThumbnail(data.thumbnail);

		if (data.type === 'MESSAGE') {
			await publish({ embeds: [embed] });
		} else {
			const components = [];

			if (categories.length === 1 && data.type !== 'BUTTON') {
				// a single-category "menu" panel shows one generic button
				components.push(
					new ButtonBuilder()
						.setCustomId(JSON.stringify({
							action: 'create',
							target: categories[0].id,
						}))
						.setStyle(Primary)
						.setLabel(getMessage('buttons.create.text'))
						.setEmoji(getMessage('buttons.create.emoji')),
				);
			} else if (data.type === 'BUTTON') {
				// button panels use each category's name and emoji, even with a single category (upstream #450, #616)
				components.push(
					...categories.map(category =>
						new ButtonBuilder()
							.setCustomId(JSON.stringify({
								action: 'create',
								target: category.id,
							}))
							.setStyle(categories.length === 1 ? Primary : Secondary)
							.setLabel(category.name)
							.setEmoji(emoji.hasEmoji(category.emoji) ? emoji.get(category.emoji) : { id: category.emoji }),
					),
				);
			} else {
				components.push(
					new StringSelectMenuBuilder()
						.setCustomId(JSON.stringify({ action: 'create' }))
						.setPlaceholder(getMessage('menus.category.placeholder'))
						.setOptions(
							categories.map(category =>
								new StringSelectMenuOptionBuilder()
									.setValue(String(category.id))
									.setLabel(category.name)
									.setDescription(category.description)
									.setEmoji(emoji.hasEmoji(category.emoji) ? emoji.get(category.emoji) : { id: category.emoji }),
							),
						),
				);

			}

			try {
				await publish({
					components: [
						new ActionRowBuilder()
							.setComponents(components),
					],
					embeds: [embed],
				});
			} catch (error) {
				if (!data.channel) await channel.delete('Failed to send panel');

				const human_errors = [];
				const action_row = error?.rawError?.errors?.components?.['0'];
				const buttons_or_options = {
					BUTTON: action_row?.components,
					MENU: action_row?.components?.['0']?.options,
				}[data.type];

				if (buttons_or_options) {
					for (const [k, v] of Object.entries(buttons_or_options)) {
						// const category = categories.find(category => category.id === parseInt(k));
						const category = categories[parseInt(k)]; // k is a string of the index, not ID
						// eslint-disable-next-line no-underscore-dangle
						const emoji_errors = v?.emoji?.id?._errors;
						if (emoji_errors) {
							const invalid_name = emoji_errors[0]?.message?.match(/Value "(.*)" is not snowflake/)?.[1];
							if (invalid_name) {
								const url = `${process.env.HTTP_EXTERNAL}/settings/${guild.id}/categories/${category.id}`;
								human_errors.push({
									message: `The emoji for the \`${category.name}\` category is invalid: \`${invalid_name}\`. <a href="${url}" target="_blank">Click here</a> to open the category's settings page in a new tab.`,
									type: 'invalid_emoji',
								});
							}
						}
					}
				}

				if (human_errors.length) {
					return res.code(400).send({
						code: error.code,
						errors: human_errors,
						status: error.status,
					});
				}

				throw error;
			}
		}

		logAdminEvent(client, {
			action: existing ? 'update' : 'create',
			guildId: guild.id,
			target: {
				id: channel.toString(),
				type: 'panel',
			},
			userId: req.user.id,
		});

		return true;
	},
	onRequest: [fastify.authenticate, fastify.isAdmin],
});
