const { Button } = require('@eartharoid/dbf');
const { MessageFlags } = require('discord.js');
const ExtendedEmbedBuilder = require('../lib/embed');

module.exports = class CreateButton extends Button {
	constructor(client, options) {
		super(client, {
			...options,
			id: 'create',
		});
	}

	/**
	 * @param {*} id
	 * @param {import("discord.js").ButtonInteraction} interaction
	 */
	async run(id, interaction) {
		// "Create ticket for user" prompts are posted in a public channel; only the target may use them (upstream #614)
		if (id.targetUser && id.targetUser !== interaction.user.id) {
			const settings = await this.client.prisma.guild.findUnique({
				select: {
					errorColour: true,
					locale: true,
				},
				where: { id: interaction.guild.id },
			});
			const getMessage = this.client.i18n.getLocale(settings?.locale);
			return await interaction.reply({
				embeds: [
					new ExtendedEmbedBuilder()
						.setColor(settings?.errorColour ?? 'Red')
						.setTitle(getMessage('commands.user.create.not_target.title'))
						.setDescription(getMessage('commands.user.create.not_target.description', { user: `<@${id.targetUser}>` })),
				],
				flags: MessageFlags.Ephemeral,
			});
		}

		await this.client.tickets.create({
			categoryId: id.target,
			interaction,
			topic: id.topic,
		});
	}
};
