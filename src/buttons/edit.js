const { Button } = require('@eartharoid/dbf');
const {
	ActionRowBuilder,
	MessageFlags,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} = require('discord.js');
const ExtendedEmbedBuilder = require('../lib/embed');
const { isStaff } = require('../lib/users');
const { buildQuestionComponent } = require('../lib/tickets/question-input');
const { pools } = require('../lib/threads');

const { crypto } = pools;

module.exports = class EditButton extends Button {
	constructor(client, options) {
		super(client, {
			...options,
			id: 'edit',
		});
	}

	async run(id, interaction) {
		/** @type {import("client")} */
		const client = this.client;

		const ticket = await client.prisma.ticket.findUnique({
			select: {
				category: { select: { name: true } },
				createdById: true,
				guild: {
					select: {
						errorColour: true,
						locale: true,
					},
				},
				questionAnswers: { include: { question: true } },
				topic: true,
			},
			where: { id: interaction.channel.id },
		});

		if (!ticket) return;
		const getMessage = client.i18n.getLocale(ticket.guild.locale);

		// only the creator can change their answers, not other members or staff (upstream #508);
		// staff can still change the topic (like with /topic)
		const allowed = ticket.createdById === interaction.user.id ||
			(ticket.questionAnswers.length === 0 && await isStaff(interaction.guild, interaction.user.id));
		if (!allowed) {
			return await interaction.reply({
				embeds: [
					new ExtendedEmbedBuilder()
						.setColor(ticket.guild.errorColour)
						.setTitle(getMessage('misc.not_creator.title'))
						.setDescription(getMessage('misc.not_creator.description')),
				],
				flags: MessageFlags.Ephemeral,
			});
		}

		if (ticket.questionAnswers.length === 0) {
			const field = new TextInputBuilder()
				.setCustomId('topic')
				.setLabel(getMessage('modals.topic.label'))
				.setStyle(TextInputStyle.Paragraph)
				.setMaxLength(1000) // same limit as when the ticket is created (upstream #678)
				.setMinLength(5)
				.setPlaceholder(getMessage('modals.topic.placeholder'))
				.setRequired(true);
			if (ticket.topic) field.setValue(await crypto.queue(w => w.decrypt(ticket.topic)));
			await interaction.showModal(
				new ModalBuilder()
					.setCustomId(JSON.stringify({
						action: 'topic',
						edit: true,
					}))
					.setTitle(ticket.category.name)
					.setComponents(
						new ActionRowBuilder()
							.setComponents(field),
					),
			);
		} else {
			await interaction.showModal(
				new ModalBuilder()
					.setCustomId(JSON.stringify({
						action: 'questions',
						edit: true,
					}))
					.setTitle(ticket.category.name)
					// labels hold either a text input or a select menu (upstream #446)
					.addLabelComponents(
						await Promise.all(
							ticket.questionAnswers.slice(0, 5).map(async a => {
								const value = a.value ? await crypto.queue(w => w.decrypt(a.value)) : null;
								return buildQuestionComponent(a.question, value, a.id);
							}),
						),
					),
			);
		}
	}
};
