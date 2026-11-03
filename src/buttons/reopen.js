const { Button } = require('@eartharoid/dbf');

// on the "ticket closed" message in channels that are kept after closing
module.exports = class ReopenButton extends Button {
	constructor(client, options) {
		super(client, {
			...options,
			id: 'reopen',
		});
	}

	/**
	 * @param {*} id
	 * @param {import("discord.js").ButtonInteraction} interaction
	 */
	async run(id, interaction) {
		/** @type {import("client")} */
		const client = this.client;

		await client.tickets.reopen(interaction);
	}
};
