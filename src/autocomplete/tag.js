const { Autocompleter } = require('@eartharoid/dbf');
const { includesIgnoreCase } = require('../lib/security');
const ms = require('ms');

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

		const cacheKey = `cache/guild-tags:${interaction.guild.id}`;
		let tags = await client.keyv.get(cacheKey);
		if (!tags) {
			tags = await client.prisma.tag.findMany({
				select: {
					content: true,
					id: true,
					name: true,
					regex: true,
				},
				where: { guildId: interaction.guild.id },
			});
			client.keyv.set(cacheKey, tags, ms('1h'));
		}

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
