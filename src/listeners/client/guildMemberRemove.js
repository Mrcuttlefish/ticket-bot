const { Listener } = require('@eartharoid/dbf');

module.exports = class extends Listener {
	constructor(client, options) {
		super(client, {
			...options,
			emitter: client,
			event: 'guildMemberRemove',
		});
	}

	/**
	 * What happens to the member's open tickets depends on the category's `onCreatorLeave` (Ticket Tool parity, P3):
	 * CLOSE (the default, and the old behaviour), DELETE (close and delete the channel even if the category keeps
	 * closed channels) or KEEP (leave the ticket open for staff).
	 * @param {import("discord.js").GuildMember} member
	 */
	async run(member) {
		/** @type {import("client")} */
		const client = this.client;

		const tickets = await client.prisma.ticket.findMany({
			include: { category: { select: { onCreatorLeave: true } } },
			where: {
				createdById: member.id,
				guildId: member.guild.id,
				open: true,
			},
		});

		for (const ticket of tickets) {
			const action = ticket.category?.onCreatorLeave ?? 'CLOSE';
			try {
				if (action === 'KEEP') {
					const settings = await client.prisma.guild.findUnique({
						select: { locale: true },
						where: { id: member.guild.id },
					});
					const getMessage = client.i18n.getLocale(settings?.locale);
					const channel = client.channels.cache.get(ticket.id);
					await channel?.send({
						allowedMentions: { parse: [] },
						content: getMessage('ticket.creator_left', { user: member.user.username }),
					});
					continue;
				}
				await client.tickets.finallyClose(ticket.id, {
					deleteChannel: action === 'DELETE',
					reason: 'user left server',
				});
			} catch (error) {
				client.log.warn(`Failed to handle ticket ${ticket.id} after its creator left`);
				client.log.error(error);
			}
		}
	}
};
