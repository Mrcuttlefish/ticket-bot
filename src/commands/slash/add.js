const { SlashCommand } = require('@eartharoid/dbf');
const {
	ApplicationCommandOptionType, MessageFlags,
} = require('discord.js');
const { grantAccess } = require('../../lib/tickets/access');
const ExtendedEmbedBuilder = require('../../lib/embed');
const { logTicketEvent } = require('../../lib/logging');

module.exports = class AddSlashCommand extends SlashCommand {
	constructor(client, options) {
		const name = 'add';
		super(client, {
			...options,
			description: client.i18n.getMessage(null, `commands.slash.${name}.description`),
			descriptionLocalizations: client.i18n.getAllMessages(`commands.slash.${name}.description`),
			dmPermission: false,
			name,
			nameLocalizations: client.i18n.getAllMessages(`commands.slash.${name}.name`),
			options: [
				{
					name: 'member',
					required: true,
					type: ApplicationCommandOptionType.User,
				},
				{
					autocomplete: true,
					name: 'ticket',
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

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const ticket = await client.prisma.ticket.findUnique({
			include: {
				category: true,
				guild: true,
			},
			where: { id: interaction.options.getString('ticket', false) || interaction.channel.id },
		});

		// the ticket option is free text, so it must be checked: only tickets in this server
		if (!ticket || ticket.guildId !== interaction.guild.id) {
			const settings = await client.prisma.guild.findUnique({ where: { id: interaction.guild.id } });
			const getMessage = client.i18n.getLocale(settings.locale);
			return await interaction.editReply({
				embeds: [
					new ExtendedEmbedBuilder({
						iconURL: interaction.guild.iconURL(),
						text: settings.footer,
					})
						.setColor(settings.errorColour)
						.setTitle(getMessage('misc.invalid_ticket.title'))
						.setDescription(getMessage('misc.invalid_ticket.description')),
				],
			});
		}

		if (!ticket.open) return await client.tickets.replyClosed(interaction, ticket);
		const getMessage = client.i18n.getLocale(ticket.guild.locale);

		if (
			ticket.id !== interaction.channel.id &&
			ticket.createdById !== interaction.member.id &&
			// staff for this ticket's category, not just staff somewhere in the server
			!client.tickets.isCategoryStaff(interaction.member, ticket.category)
		) {
			return await interaction.editReply({
				embeds: [
					new ExtendedEmbedBuilder({
						iconURL: interaction.guild.iconURL(),
						text: ticket.guild.footer,
					})
						.setColor(ticket.guild.errorColour)
						.setTitle(getMessage('commands.slash.add.not_staff.title'))
						.setDescription(getMessage('commands.slash.add.not_staff.description')),
				],
			});
		}

		/** @type {import("discord.js").TextChannel} */
		const ticketChannel = client.channels.cache.get(ticket.id) ?? await interaction.guild.channels.fetch(ticket.id);
		const member = interaction.options.getMember('member', true);

		await grantAccess(ticketChannel, member, `${interaction.user.tag} added ${member.user.tag} to the ticket`);

		await ticketChannel.send({
			embeds: [
				new ExtendedEmbedBuilder()
					.setColor(ticket.guild.primaryColour)
					.setDescription(getMessage('commands.slash.add.added', {
						added: member.toString(),
						by: interaction.member.toString(),
					})),
			],
		});

		await interaction.editReply({
			embeds: [
				new ExtendedEmbedBuilder({
					iconURL: interaction.guild.iconURL(),
					text: ticket.guild.footer,
				})
					.setColor(ticket.guild.successColour)
					.setTitle(getMessage('commands.slash.add.success.title'))
					.setDescription(getMessage('commands.slash.add.success.description', {
						member: member.toString(),
						ticket: ticketChannel.toString(),
					})),
			],
		});

		logTicketEvent(this.client, {
			action: 'update',
			diff: {
				original: {},
				updated: { [getMessage('log.ticket.added')]: member.user.tag },
			},
			target: {
				id: ticket.id,
				name: `<#${ticket.id}>`,
			},
			userId: interaction.user.id,
		});

	}
};
