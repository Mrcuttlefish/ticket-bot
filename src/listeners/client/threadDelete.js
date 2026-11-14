const { Listener } = require('@eartharoid/dbf');

// thread tickets (Ticket Tool parity, P3): Discord sends threadDelete, not channelDelete, for threads
module.exports = class extends Listener {
	constructor(client, options) {
		super(client, {
			...options,
			emitter: client,
			event: 'threadDelete',
		});
	}

	async run(thread) {
		/** @type {import("client")} */
		const client = this.client;

		const ticket = await client.prisma.ticket.findUnique({
			select: { open: true },
			where: { id: thread.id },
		});

		if (ticket?.open) {
			await client.tickets.finallyClose(thread.id, { reason: 'channel deleted' });
			client.log.info.tickets(`Closed ticket ${thread.id} because the thread was deleted`);
		}
	}
};
