const { SlashCommand } = require('@eartharoid/dbf');
const {
	ApplicationCommandOptionType, MessageFlags, OverwriteType,
} = require('discord.js');
const { isThreadTicket } = require('../../lib/tickets/access');
const ExtendedEmbedBuilder = require('../../lib/embed');
const { isStaff } = require('../../lib/users');
const { getEmoji } = require('./priority');
const {
	formatChannelName, formatOpeningMessage,
} = require('../../lib/tickets/placeholders');
const {
	buildButtons, buildOpeningMessage, editOpeningButtons,
} = require('../../lib/tickets/opening-message');
const { resolveCategorySettings } = require('../../lib/tickets/options');
const { pools } = require('../../lib/threads');

module.exports = class MoveSlashCommand extends SlashCommand {
	constructor(client, options) {
		const name = 'move';
		super(client, {
			...options,
			description: client.i18n.getMessage(null, `commands.slash.${name}.description`),
			descriptionLocalizations: client.i18n.getAllMessages(`commands.slash.${name}.description`),
			dmPermission: false,
			name,
			nameLocalizations: client.i18n.getAllMessages(`commands.slash.${name}.name`),
			options: [
				{
					autocomplete: true,
					name: 'category',
					required: true,
					type: ApplicationCommandOptionType.Integer,
				},
				{
					maxLength: 500,
					name: 'reason',
					required: false,
					type: ApplicationCommandOptionType.String,
				},
			].map(option => {
				option.descriptionLocalizations = client.i18n.getAllMessages(`commands.slash.${name}.options.${option.name}.description`);
				option.description = option.descriptionLocalizations['en-GB'];
				option.nameLocalizations = client.i18n.getAllMessages(`commands.slash.${name}.options.${option.name}.name`);
				return option;
			}),
		});
	}

	/**
	 * @param {import("discord.js").ChatInputCommandInteraction} interaction
	 */
	async run(interaction) {
		/** @type {import("client")} */
		const client = this.client;

		await interaction.deferReply();

		const ticket = await client.prisma.ticket.findUnique({
			include: {
				category: true,
				guild: true,
			},
			where: { id: interaction.channel.id },
		});

		if (!ticket) {
			const settings = await client.prisma.guild.findUnique({ where: { id: interaction.guild.id } });
			const getMessage = client.i18n.getLocale(settings.locale);
			return await interaction.editReply({
				embeds: [
					new ExtendedEmbedBuilder({
						iconURL: interaction.guild.iconURL(),
						text: settings.footer,
					})
						.setColor(settings.errorColour)
						.setTitle(getMessage('misc.not_ticket.title'))
						.setDescription(getMessage('misc.not_ticket.description')),
				],
				flags: MessageFlags.Ephemeral,
			});
		}

		if (!ticket.open) return await client.tickets.replyClosed(interaction, ticket);
		const getMessage = client.i18n.getLocale(ticket.guild.locale);

		if (!(await isStaff(interaction.guild, interaction.user.id))) { // if user is not staff
			return await interaction.editReply({
				embeds: [
					new ExtendedEmbedBuilder({
						iconURL: interaction.guild.iconURL(),
						text: ticket.guild.footer,
					})
						.setColor(ticket.guild.errorColour)
						.setTitle(getMessage('commands.slash.move.not_staff.title'))
						.setDescription(getMessage('commands.slash.move.not_staff.description')),
				],
			});
		}

		const creator = await interaction.guild.members.fetch(ticket.createdById);
		const newCategory = await client.prisma.category.findUnique({ where: { id: interaction.options.getInteger('category', true) } });
		if (!newCategory || newCategory.guildId !== interaction.guild.id) {
			return await interaction.editReply({
				embeds: [
					new ExtendedEmbedBuilder({
						iconURL: interaction.guild.iconURL(),
						text: ticket.guild.footer,
					})
						.setColor(ticket.guild.errorColour)
						.setTitle(getMessage('misc.unknown_category.title'))
						.setDescription(getMessage('misc.unknown_category.description')),
				],
			});
		}
		// thread tickets can't become channels (or the other way round), or move to another channel
		if (isThreadTicket(interaction.channel) || newCategory.channelType === 'THREAD') {
			return await interaction.editReply({
				embeds: [
					new ExtendedEmbedBuilder({
						iconURL: interaction.guild.iconURL(),
						text: ticket.guild.footer,
					})
						.setColor(ticket.guild.errorColour)
						.setTitle(getMessage('commands.slash.move.thread.title'))
						.setDescription(getMessage('commands.slash.move.thread.description')),
				],
			});
		}
		const discordCategory = await interaction.guild.channels.fetch(newCategory.discordCategory);
		const reason = interaction.options.getString('reason', false)?.trim().slice(0, 500) || null;
		// servers can make /move release the ticket, so staff of the new category can pick it up (Ticket Tool parity, P2)
		const claimer = ticket.claimedById;
		const release = Boolean(ticket.guild.moveRelease && claimer);

		if (discordCategory.children.cache.size === 50) {
			return await interaction.editReply({
				embeds: [
					new ExtendedEmbedBuilder({
						iconURL: interaction.guild.iconURL(),
						text: ticket.guild.footer,
					})
						.setColor(ticket.guild.errorColour)
						.setTitle(getMessage('misc.category_full.title'))
						.setDescription(getMessage('misc.category_full.description')),
				],
				flags: MessageFlags.Ephemeral,
			});
		} else {
			// don't reassign `ticket`, the previous value is used below
			await client.prisma.ticket.update({
				data: { category: { connect: { id: newCategory.id } } },
				where: { id: ticket.id },
			});

			// alias
			const $counters = client.tickets.$count.categories;

			// make sure new category exist (#531)
			$counters[newCategory.id] ??= {};

			// more specific aliases
			const $oldCategory = $counters[ticket.categoryId];
			const $newCategory = $counters[newCategory.id];

			// decrement old's total and member count
			$oldCategory.total--;
			$oldCategory[ticket.createdById]--;

			// increment new's totaL count
			$newCategory.total ||= 0;
			$newCategory.total++;

			// increment new's member count
			$newCategory[ticket.createdById] ||= 0;
			$newCategory[ticket.createdById]++;

			// these 3 could be done separately,
			// but using `setParent`, `setName` etc instead of a single `edit` call increases the number of API requests
			if (
				release ||
				JSON.stringify(newCategory.staffRoles) !== JSON.stringify(ticket.category.staffRoles) ||
				newCategory.channelName !== ticket.category.channelName ||
				newCategory.discordCategory !== ticket.category.discordCategory
			) {
				const allow = ['ViewChannel', 'ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'AttachFiles'];
				const channelName = formatChannelName(newCategory.channelName, {
					displayName: creator.displayName,
					number: ticket.number,
					username: creator.user.username,
				});
				await interaction.channel.edit({
					lockPermissions: false,
					name: ticket.priority ? getEmoji(ticket.priority) + channelName : channelName,
					parent: discordCategory,
					permissionOverwrites: [
						{
							deny: ['ViewChannel'],
							id: interaction.guild.roles.everyone,
						},
						{
							allow,
							id: this.client.user.id,
						},
						{
							allow,
							id: creator.id,
						},
						// keep members that were added to the ticket, and the claimer (upstream #514)
						...interaction.channel.permissionOverwrites.cache
							.filter(o => o.type === OverwriteType.Member && o.id !== creator.id && o.id !== this.client.user.id)
							// a released claimer loses the access that came with the claim
							.filter(o => !(release && o.id === claimer))
							.map(o => ({
								allow: o.allow,
								deny: o.deny,
								id: o.id,
								type: OverwriteType.Member,
							})),
						// if the ticket is claimed, staff roles stay hidden like they are after /claim
						...newCategory.staffRoles.map(id => (ticket.claimedById && !release
							? {
								deny: ['ViewChannel'],
								id,
							}
							: {
								allow,
								id,
							})),
					],
					reason: `Moved by ${interaction.user.tag}`,
				});
			}

			if (release) {
				await client.prisma.ticket.update({
					data: { claimedBy: { disconnect: true } },
					where: { id: ticket.id },
				});
			}

			await interaction.editReply({
				embeds: [
					new ExtendedEmbedBuilder()
						.setColor(ticket.guild.primaryColour)
						.setDescription(getMessage(reason ? 'commands.slash.move.moved_reason' : 'commands.slash.move.moved', {
							// anonymous tickets don't say which staff member moved them
							by: newCategory.anonymous || ticket.category.anonymous ? getMessage('ticket.anonymous.staff') : interaction.user.toString(),
							from: ticket.category.name,
							reason,
							to: newCategory.name,
						})),
				],
			});

			const category = await client.tickets.getCategory(newCategory.id, true);
			const categorySettings = resolveCategorySettings(category.guild, category);
			const claimed = Boolean(claimer) && !release;
			const buttons = buildButtons({
				claim: categorySettings.claimButton && category.claiming ? (claimed ? 'unclaim' : 'claim') : null,
				close: categorySettings.closeButton,
				custom: category.guild.buttons,
				// a resent opening message only shows the topic (the old category's questions don't apply)
				edit: !ticket.guild.moveResend && Boolean(ticket.topic),
				getMessage,
			});
			if (ticket.guild.moveResend) {
				// send the new category's opening message, which then holds the ticket's buttons
				const topic = ticket.topic ? await pools.crypto.queue(w => w.decrypt(ticket.topic)) : null;
				const sent = await interaction.channel.send({
					...buildOpeningMessage({
						author: {
							avatar: creator.displayAvatarURL(),
							name: creator.displayName,
						},
						buttons,
						colour: category.guild.primaryColour,
						content: creator.toString(),
						description: formatOpeningMessage(category.openingMessage, {
							category,
							creator,
							number: ticket.number,
							topic,
						}).trim() || null,
						fields: topic ? [{
							name: getMessage('ticket.opening_message.fields.topic'),
							value: topic,
						}] : [],
						footer: category.guild.footer
							? {
								iconURL: interaction.guild.iconURL(),
								text: category.guild.footer,
							}
							: null,
						image: category.image,
						style: category.openingStyle,
						v2: category.guild.componentsV2,
					}),
					allowedMentions: { parse: [] }, // the creator was already pinged when the ticket opened
				}).catch(error => {
					client.log.warn(`Failed to send the opening message of the new category in ticket ${ticket.id}`, error);
					return null;
				});
				if (sent) {
					const old = await interaction.channel.messages.fetch(ticket.openingMessageId).catch(() => null);
					if (old?.components.length) await editOpeningButtons(old, null).catch(() => null);
					if (old?.pinned) await old.unpin().catch(() => null);
					await sent.pin().catch(() => null);
					await client.prisma.ticket.update({
						data: { openingMessageId: sent.id },
						where: { id: ticket.id },
					});
				}
			} else if (release) {
				const old = await interaction.channel.messages.fetch(ticket.openingMessageId).catch(() => null);
				if (old?.components.length) await editOpeningButtons(old, buttons).catch(() => null);
			}
			await client.tickets.getTicket(ticket.id, true);

		}
	}
};
