const {
	TextInputBuilder, TextInputStyle,
} = require('discord.js');

// answers are capped so they fit in embeds (see upstream #678)
const MAX_ANSWER_LENGTH = 1000;

/**
 * Build the text input for a question.
 * placeholder, minLength and maxLength are optional in the database, but discord.js rejects null values,
 * so a question saved without them used to stop tickets from being created (or answers edited).
 * @param {object} question
 * @param {string | null} [value] the existing answer, if editing
 * @param {string} [customId]
 * @returns {TextInputBuilder}
 */
function buildQuestionInput(question, value, customId = question.id) {
	const maxLength = Math.min(question.maxLength || MAX_ANSWER_LENGTH, MAX_ANSWER_LENGTH);
	const minLength = Math.min(question.minLength ?? 0, maxLength);
	const field = new TextInputBuilder()
		.setCustomId(String(customId))
		.setLabel(question.label)
		.setStyle(question.style === TextInputStyle.Short ? TextInputStyle.Short : TextInputStyle.Paragraph)
		.setMaxLength(maxLength)
		.setMinLength(minLength)
		.setRequired(question.required ?? true);
	if (question.placeholder) field.setPlaceholder(question.placeholder);
	const initial = value || question.value;
	if (initial) field.setValue(initial.slice(0, maxLength));
	return field;
}

module.exports = {
	MAX_ANSWER_LENGTH,
	buildQuestionInput,
};
