const {
	LabelBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextInputBuilder,
	TextInputStyle,
} = require('discord.js');
const emoji = require('node-emoji');

// answers are capped so they fit in embeds (see upstream #678)
const MAX_ANSWER_LENGTH = 1000;

// menu answers are stored as the chosen options' labels, one per line, so they read well in the opening message,
// transcripts and the archive
const MENU_SEPARATOR = '\n';

/**
 * Build the text input for a question.
 * placeholder, minLength and maxLength are optional in the database, but discord.js rejects null values,
 * so a question saved without them used to stop tickets from being created (or answers edited).
 * @param {object} question
 * @param {string | null} [value] the existing answer, if editing
 * @param {string} [customId]
 * @param {boolean} [withLabel] whether the input has its own label (inputs in a label component must not)
 * @returns {TextInputBuilder}
 */
function buildQuestionInput(question, value, customId = question.id, withLabel = true) {
	const maxLength = Math.min(question.maxLength || MAX_ANSWER_LENGTH, MAX_ANSWER_LENGTH);
	const minLength = Math.min(question.minLength ?? 0, maxLength);
	const field = new TextInputBuilder()
		.setCustomId(String(customId))
		.setStyle(question.style === TextInputStyle.Short ? TextInputStyle.Short : TextInputStyle.Paragraph)
		.setMaxLength(maxLength)
		.setMinLength(minLength)
		.setRequired(question.required ?? true);
	if (withLabel) field.setLabel(question.label);
	if (question.placeholder) field.setPlaceholder(question.placeholder);
	const initial = value || question.value;
	if (initial) field.setValue(initial.slice(0, maxLength));
	return field;
}

/**
 * @param {object} question
 * @returns {{ label: string, description?: string, emoji?: string }[]}
 */
function getMenuOptions(question) {
	const options = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
	return Array.isArray(options) ? options.slice(0, 25) : [];
}

/**
 * Build a select menu for a "MENU" question (upstream #446).
 * `minLength` and `maxLength` are the fewest and most options that can be chosen.
 * @param {object} question
 * @param {string | null} [value] the existing answer, if editing
 * @param {string} [customId]
 * @returns {StringSelectMenuBuilder}
 */
function buildQuestionMenu(question, value, customId = question.id) {
	const options = getMenuOptions(question);
	const chosen = new Set((value ?? '').split(MENU_SEPARATOR));
	const required = question.required ?? true;
	const max = Math.min(Math.max(question.maxLength ?? 1, 1), options.length);
	const min = required ? Math.min(Math.max(question.minLength ?? 1, 1), max) : 0;
	return new StringSelectMenuBuilder()
		.setCustomId(String(customId))
		.setPlaceholder((question.placeholder || question.label).slice(0, 150))
		.setMinValues(min)
		.setMaxValues(max)
		.setRequired(required)
		.setOptions(options.map((option, i) => {
			const builder = new StringSelectMenuOptionBuilder()
				.setValue(String(i))
				.setLabel(option.label)
				.setDefault(chosen.has(option.label));
			if (option.description) builder.setDescription(option.description);
			if (option.emoji) builder.setEmoji(emoji.hasEmoji(option.emoji) ? emoji.get(option.emoji) : { id: option.emoji });
			return builder;
		}));
}

/**
 * Build the modal component for a question: a label containing a text input or a select menu.
 * @param {object} question
 * @param {string | null} [value] the existing answer, if editing
 * @param {string} [customId]
 * @returns {LabelBuilder}
 */
function buildQuestionComponent(question, value, customId = question.id) {
	const label = new LabelBuilder().setLabel(question.label);
	if (question.type === 'MENU') return label.setStringSelectMenuComponent(buildQuestionMenu(question, value, customId));
	return label.setTextInputComponent(buildQuestionInput(question, value, customId, false));
}

/**
 * Read a question's answer from a submitted modal.
 * @param {import('discord.js').ModalSubmitFields} fields
 * @param {object} question
 * @param {string} [customId]
 * @returns {string} the answer (for menus, the chosen options' labels, one per line); empty if not answered
 */
function readAnswer(fields, question, customId = question.id) {
	customId = String(customId);
	if (question.type === 'MENU') {
		const options = getMenuOptions(question);
		let values;
		try {
			values = fields.getStringSelectValues(customId);
		} catch {
			return '';
		}
		return values
			.map(value => options[Number(value)]?.label)
			.filter(Boolean)
			.join(MENU_SEPARATOR);
	}
	try {
		return fields.getTextInputValue(customId) ?? '';
	} catch {
		return '';
	}
}

module.exports = {
	MAX_ANSWER_LENGTH,
	MENU_SEPARATOR,
	buildQuestionComponent,
	buildQuestionInput,
	buildQuestionMenu,
	getMenuOptions,
	readAnswer,
};
