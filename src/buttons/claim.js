const { Button } = require('@eartharoid/dbf');
const { buttonDenied } = require('../lib/buttons');

module.exports = class ClaimButton extends Button {
	constructor(client, options) {
		super(client, {
			...options,
			id: 'claim',
		});
	}

	/**
	 * @param {*} id
	 * @param {import("discord.js").ChatInputCommandInteraction} interaction
	 */
	async run(id, interaction) {
		if (await buttonDenied(this.client, interaction, 'claim')) return;
		/** @type {import("client")} */
		const client = this.client;

		await client.tickets.claim(interaction);
	}
};
