const { SlashCommand } = require('@eartharoid/dbf');
const {
	ApplicationCommandOptionType, MessageFlags,
} = require('discord.js');
const ExtendedEmbedBuilder = require('../../lib/embed');
const { fillTagPlaceholders } = require('../../lib/tags');
const { pools } = require('../../lib/threads');

const { crypto } = pools;

module.exports = class TagSlashCommand extends SlashCommand {
	constructor(client, options) {
		const name = 'tag';
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
					name: 'tag',
					required: true,
					type: ApplicationCommandOptionType.Integer,
				},
				{
					name: 'for',
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
	}

	/**
	 * @param {import("discord.js").ChatInputCommandInteraction} interaction
	 */
	async run(interaction) {
		/** @type {import("client")} */
		const client = this.client;

		const user = interaction.options.getUser('for', false);
		await interaction.deferReply({ flags: user ? 0 : MessageFlags.Ephemeral });
		// tags from other servers must not be readable by ID
		const tag = await client.prisma.tag.findFirst({
			include: { guild: true },
			where: {
				guildId: interaction.guild.id,
				id: interaction.options.getInteger('tag', true),
			},
		});

		if (!tag) {
			const settings = await client.prisma.guild.findUnique({ where: { id: interaction.guild.id } });
			const getMessage = client.i18n.getLocale(settings?.locale);
			return await interaction.editReply({
				embeds: [
					new ExtendedEmbedBuilder()
						.setColor(settings?.errorColour ?? 'Red')
						.setTitle(getMessage('misc.error.title'))
						.setDescription(getMessage('misc.error.description')),
				],
			});
		}

		const ticket = await client.prisma.ticket.findUnique({
			select: {
				createdById: true,
				number: true,
				topic: true,
			},
			where: { id: interaction.channel.id },
		});
		if (ticket?.topic) ticket.topic = await crypto.queue(w => w.decrypt(ticket.topic));

		await interaction.editReply({
			allowedMentions: { users: user ? [user.id]: [] },
			content: user?.toString(),
			embeds: [
				new ExtendedEmbedBuilder()
					.setColor(tag.guild.primaryColour)
					.setDescription(fillTagPlaceholders(tag.content, {
						author: interaction.user,
						channel: interaction.channel,
						guild: interaction.guild,
						ticket,
						user: user ?? interaction.user,
					})),
			],
		});
	}
};
