const {
	findViewableTicket, getPortalEvents, serializeMessages,
} = require('../../../../../../lib/tickets/portal');

const HEARTBEAT = 25_000; // so proxies don't drop the stream

// GET /api/guilds/:guild/tickets/:ticket/events — server-sent events for live replies (archive portal, upstream #337)
module.exports.get = fastify => ({
	handler: async (req, res) => {
		/** @type {import('client')} */
		const client = req.routeOptions.config.client;
		const found = await findViewableTicket(req, res);
		if (!found) return;
		const { ticket } = found;

		res.hijack();
		res.raw.writeHead(200, {
			'Cache-Control': 'no-cache, no-transform',
			'Connection': 'keep-alive',
			'Content-Type': 'text/event-stream; charset=utf-8',
			'X-Accel-Buffering': 'no',
		});
		const send = (event, data) => res.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
		send('ready', { ticketId: ticket.id });

		const events = getPortalEvents(client);
		const onMessage = async ({
			messageId, ticketId,
		}) => {
			if (ticketId !== ticket.id) return;
			try {
				const [row, fresh] = await Promise.all([
					client.prisma.archivedMessage.findUnique({ where: { id: messageId } }),
					client.prisma.ticket.findUnique({
						include: {
							archivedRoles: true,
							archivedUsers: true,
							category: true,
						},
						where: { id: ticket.id },
					}),
				]);
				if (!row || !fresh) return;
				const [message] = await serializeMessages(client, fresh, [row]);
				send('message', message);
			} catch (error) {
				client.log.error.http(error);
			}
		};
		const onDeleted = ({
			messageId, ticketId,
		}) => {
			if (ticketId === ticket.id) send('message-deleted', { id: messageId });
		};
		const onClosed = ({ ticketId }) => {
			if (ticketId !== ticket.id) return;
			send('ticket-closed', { id: ticketId });
			res.raw.end();
		};
		events.on('message', onMessage);
		events.on('message-deleted', onDeleted);
		events.on('ticket-closed', onClosed);
		const heartbeat = setInterval(() => res.raw.write(': ping\n\n'), HEARTBEAT);
		heartbeat.unref?.();

		const cleanup = () => {
			clearInterval(heartbeat);
			events.off('message', onMessage);
			events.off('message-deleted', onDeleted);
			events.off('ticket-closed', onClosed);
		};
		req.raw.on('close', cleanup);
		res.raw.on('close', cleanup);
		if (!ticket.open) onClosed({ ticketId: ticket.id });
	},
	onRequest: [fastify.authenticate, fastify.isMember],
});
