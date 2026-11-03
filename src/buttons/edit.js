const { Button } = require('@eartharoid/dbf');
const {
	ActionRowBuilder,
	MessageFlags,
	ModalBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextInputBuilder,
	TextInputStyle,
} = require('discord.js');
const emoji = require('node-emoji');
const ExtendedEmbedBuilder = require('../lib/embed');
const { isStaff } = require('../lib/users');
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
					.setComponents(
						await Promise.all(
							ticket.questionAnswers
								.filter(a => a.question.type === 'TEXT') // TODO: remove this when modals support select menus
								.map(async a => {
									if (a.question.type === 'TEXT') {
										const field = new TextInputBuilder()
											.setCustomId(String(a.id))
											.setLabel(a.question.label)
											.setStyle(a.question.style)
											.setMaxLength(Math.min(a.question.maxLength, 1000))
											.setMinLength(a.question.minLength)
											.setPlaceholder(a.question.placeholder)
											.setRequired(a.question.required);
										if (a.value) field.setValue(await crypto.queue(w => w.decrypt(a.value)));
										else if (a.question.value) field.setValue(a.question.value);
										return new ActionRowBuilder().setComponents(field);
									} else if (a.question.type === 'MENU') {
										return new ActionRowBuilder()
											.setComponents(
												new StringSelectMenuBuilder()
													.setCustomId(a.question.id)
													.setPlaceholder(a.question.placeholder || a.question.label)
													.setMaxValues(a.question.maxLength)
													.setMinValues(a.question.minLength)
													.setOptions(
														a.question.options.map((o, i) => {
															const builder = new StringSelectMenuOptionBuilder()
																.setValue(String(i))
																.setLabel(o.label);
															if (o.description) builder.setDescription(o.description);
															if (o.emoji) {
																builder.setEmoji(emoji.hasEmoji(o.emoji)
																	? emoji.get(o.emoji)
																	: { id: o.emoji });
															}
															return builder;
														}),
													),
											);
									}
								}),
						),
					),
			);
		}
	}
};
