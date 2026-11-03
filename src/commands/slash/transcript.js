const { SlashCommand } = require('@eartharoid/dbf');
const {
	ApplicationCommandOptionType,
	PermissionsBitField,
	MessageFlags,
} = require('discord.js');
const fs = require('fs');
const { join } = require('path');
const Mustache = require('mustache');
const { AttachmentBuilder } = require('discord.js');
const ExtendedEmbedBuilder = require('../../lib/embed');
const { formatChannelName } = require('../../lib/tickets/placeholders');
const { pools } = require('../../lib/threads');
const { anonymiseTranscript } = require('../../lib/tickets/anonymous');
const { TRANSCRIPT_INCLUDE } = require('../../lib/tickets/transcript-file');

const { transcript: pool } = pools;

module.exports = class TranscriptSlashCommand extends SlashCommand {
	constructor(client, options) {
		const name = 'transcript';
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
					name: 'ticket',
					required: true,
					type: ApplicationCommandOptionType.String,
				},
				{
					name: 'member',
					required: false,
					type: ApplicationCommandOptionType.User,
				},
			].map(option => {
				option.descriptionLocalizations = client.i18n.getAllMessages(`commands.slash.${name}.options.${option.name}.description`);
				option.description = option.descriptionLocalizations['en-GB'];
				option.nameLocalizations = client.i18n.getAllMessages(`commands.slash.${name}.options.${option.name}.name`);
				return option;
			}),
		});

		Mustache.escape = text => text; // don't HTML-escape
		this.template = fs.readFileSync(
			join('./user/templates/', this.client.config.templates.transcript + '.mustache'),
			{ encoding: 'utf8' },
		);
	}

	shouldAllowAccess(interaction, ticket) {
		// the creator can always get their ticket, even from outside the guild
		if (ticket.createdById === interaction.user.id) return true; // user not member (DMs)
		return this.isStaffFor(interaction, ticket);
	}

	isStaffFor(interaction, ticket) {
		// must be in the guild
		if (interaction.guild?.id !== ticket.guildId) return false;
		// and have authority
		if (interaction.client.supers.includes(interaction.member.id)) return true;
		if (interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return true;
		if (interaction.member.roles.cache.filter(role => ticket.category.staffRoles.includes(role.id)).size > 0) return true;
		return false;
	}

	/**
	 * @param {object} ticket
	 * @param {object} [options]
	 * @param {boolean} [options.anonymise] hide staff names (anonymous tickets)
	 */
	async fillTemplate(ticket, { anonymise = false } = {}) {
		/** @type {import("client")} */
		const client = this.client;

		ticket = await pool.queue(w => w(ticket));
		if (anonymise) anonymiseTranscript(ticket, client.i18n.getMessage(ticket.guild.locale, 'ticket.anonymous.staff'));

		const channelName = formatChannelName(ticket.category.channelName, {
			displayName: ticket.createdBy?.displayName,
			number: ticket.number,
			username: ticket.createdBy?.username,
		});
		const fileName = `${channelName}.${this.client.config.templates.transcript.split('.').slice(-1)[0]}`;
		const transcript = Mustache.render(this.template, {
			channelName,
			closedAtFull: function () {
				return new Intl.DateTimeFormat([ticket.guild.locale, 'en-GB'], {
					dateStyle: 'full',
					timeStyle: 'long',
					timeZone: 'Etc/UTC',
				}).format(this.closedAt);
			},
			createdAtFull: function () {
				return new Intl.DateTimeFormat([ticket.guild.locale, 'en-GB'], {
					dateStyle: 'full',
					timeStyle: 'long',
					timeZone: 'Etc/UTC',
				}).format(this.createdAt);
			},
			createdAtTimestamp: function () {
				return new Intl.DateTimeFormat([ticket.guild.locale, 'en-GB'], {
					dateStyle: 'short',
					timeStyle: 'long',
					timeZone: 'Etc/UTC',
				}).format(this.createdAt);
			},
			guildName: client.guilds.cache.get(ticket.guildId)?.name,
			pinned: ticket.pinnedMessageIds.join(', '),
			ticket,
		});

		return {
			fileName,
			transcript,
		};
	}

	/**
	 * @param {import("discord.js").ChatInputCommandInteraction} interaction
	 */
	async run(interaction, ticketId) {
		/** @type {import("client")} */
		const client = this.client;

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		ticketId = ticketId || interaction.options.getString('ticket', true);
		const ticket = await client.prisma.ticket.findUnique({
			include: TRANSCRIPT_INCLUDE,
			where: interaction.guildId && ticketId.length < 16
				? {
					guildId_number: {
						guildId: interaction.guildId,
						number: parseInt(ticketId),
					},
				}
				: { id: ticketId },
		});

		if (!ticket) throw new Error(`Ticket ${ticketId} does not exist`);

		if (!this.shouldAllowAccess(interaction, ticket)) {
			// may be used in DMs, so use the ticket's guild rather than `interaction.guild`
			const getMessage = client.i18n.getLocale(ticket.guild.locale);
			return await interaction.editReply({
				embeds: [
					new ExtendedEmbedBuilder({
						iconURL: client.guilds.cache.get(ticket.guildId)?.iconURL(),
						text: ticket.guild.footer,
					})
						.setColor(ticket.guild.errorColour)
						.setTitle(getMessage('commands.slash.transcript.not_staff.title'))
						.setDescription(getMessage('commands.slash.transcript.not_staff.description')),
				],
			});
		}

		const {
			fileName,
			transcript,
		} = await this.fillTemplate(ticket, { anonymise: Boolean(ticket.category.anonymous) }); // for staff too
		const attachment = new AttachmentBuilder()
			.setFile(Buffer.from(transcript))
			.setName(fileName);

		await interaction.editReply({ files: [attachment] });
		// TODO: add portal link
	}
};
