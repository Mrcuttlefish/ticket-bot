const { Autocompleter } = require('@eartharoid/dbf');
const { includesIgnoreCase } = require('../lib/security');
const { getGuildTags } = require('../lib/tags');

module.exports = class TagCompleter extends Autocompleter {
	constructor(client, options) {
		super(client, {
			...options,
			id: 'tag',
		});
	}

	/**
	 * @param {string} value
	 * @param {*} command
	 * @param {import("discord.js").AutocompleteInteraction} interaction
	 */
	async run(value, command, interaction) {
		/** @type {import("client")} */
		const client = this.client;

		const tags = await getGuildTags(client, interaction.guild.id);

		const options = value ? tags.filter(tag =>
			includesIgnoreCase(tag.name, value) ||
			includesIgnoreCase(tag.content, value) ||
			includesIgnoreCase(tag.regex, value),
		) : tags;
		await interaction.respond(
			options
				.slice(0, 25)
				.map(tag => ({
					name: tag.name,
					value: tag.id,
				})),
		);
	}
};
