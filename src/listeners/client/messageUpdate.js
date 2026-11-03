const { Listener } = require('@eartharoid/dbf');
const { resolveCategorySettings } = require('../../lib/tickets/options');
const { MessageFlags } = require('discord.js');
const { logMessageEvent } = require('../../lib/logging');

module.exports = class extends Listener {
	constructor(client, options) {
		super(client, {
			...options,
			emitter: client,
			event: 'messageUpdate',
		});
	}


	/**
	 * @param {import("discord.js").Message} oldMessage
	 * @param {import("discord.js").Message} newMessage
	 */
	async run(oldMessage, newMessage) {
		/** @type {import("client")} */
		const client = this.client;

		if (newMessage.partial) {
			try {
				newMessage = await newMessage.fetch();
			} catch (error) {
				client.log.error(error);
			}
		}

		if (!newMessage.guild) return;
		if (newMessage.flags.has(MessageFlags.Ephemeral)) return;
		if (!newMessage.editedAt) return;

		const ticket = await client.prisma.ticket.findUnique({
			include: {
				category: true,
				guild: true,
			},
			where: { id: newMessage.channel.id },
		});
		if (!ticket) return;

		// the archive of a closed ticket is final: edits in a kept channel (e.g. staff notes written after closing,
		// which were never archived) must not be added to it, or they'd show up in transcripts the creator can see
		if (ticket.open && resolveCategorySettings(ticket.guild, ticket.category).archive) {
			try {
				await client.tickets.archiver.saveMessage(ticket.id, newMessage);
			} catch (error) {
				client.log.warn('Failed to update archived message', newMessage.id);
				client.log.error(error);
				newMessage.react('❌').catch(client.log.error);
			}
		}

		if (newMessage.author.id === client.user.id) return;

		await logMessageEvent(this.client, {
			action: 'update',
			diff: {
				original: { content: oldMessage.cleanContent },
				updated: { content: newMessage.cleanContent },
			},
			target: newMessage,
			ticket,
		});
	}
};
