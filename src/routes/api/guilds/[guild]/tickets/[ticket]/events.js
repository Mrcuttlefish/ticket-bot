const {
	canStillView, findViewableTicket, getPortalEvents, getPortalStreams, serializeMessages,
} = require('../../../../../../lib/tickets/portal');
const { isTokenCurrent } = require('../../../../../../lib/jwt-secret');

const HEARTBEAT = 25_000; // so proxies don't drop the stream
// access is checked again this often, and when the viewer's roles change or they leave the server
const ACCESS_CHECK = 60_000;
// and before sending a message, at most this often (busy tickets would otherwise check on every message)
const MESSAGE_ACCESS_CHECK = 5_000;

// GET /api/guilds/:guild/tickets/:ticket/events — server-sent events for live replies (archive portal, upstream #337)
module.exports.get = fastify => ({
	handler: async (req, res) => {
		/** @type {import('client')} */
		const client = req.routeOptions.config.client;
		const found = await findViewableTicket(req, res);
		if (!found) return;
		const { ticket } = found;
		const guildId = ticket.guildId;
		const userId = req.user.id;
		const tokenData = req.user;

		res.hijack();
		res.raw.writeHead(200, {
			'Cache-Control': 'no-cache, no-transform',
			'Connection': 'keep-alive',
			'Content-Type': 'text/event-stream; charset=utf-8',
			'X-Accel-Buffering': 'no',
		});
		let closed = false;
		const send = (event, data) => {
			if (!closed) res.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
		};

		const events = getPortalEvents(client);
		const streams = getPortalStreams(client);
		const stream = {};

		const cleanup = () => {
			if (closed) return;
			closed = true;
			clearInterval(heartbeat);
			clearInterval(accessTimer);
			events.off('message', onMessage);
			events.off('message-deleted', onDeleted);
			events.off('ticket-closed', onClosed);
			if (streams.get(userId) === stream) streams.delete(userId);
		};
		/** Tell the browser why the stream ended (so it doesn't reconnect), then end it. */
		const end = (event, data = { id: ticket.id }) => {
			send(event, data);
			cleanup();
			res.raw.end();
		};
		stream.close = event => end(event);
		// lost a role (e.g. staff) or left the server: check now rather than at the next interval
		stream.onMemberChange = (changedGuildId, removed) => {
			if (changedGuildId !== guildId) return;
			if (removed) end('access-revoked');
			else checkAccess();
		};

		// one stream per user: replace the old one
		streams.get(userId)?.close('replaced');
		streams.set(userId, stream);

		let lastCheck = Date.now();
		let checking = null;
		/** @returns {Promise<boolean>} whether the viewer can still see the ticket; ends the stream if not */
		const checkAccess = () => (checking ??= (async () => {
			try {
				lastCheck = Date.now();
				const allowed = isTokenCurrent(tokenData, process.env.INVALIDATE_TOKENS) &&
					await canStillView(client, guildId, userId, ticket.id);
				if (!allowed) end('access-revoked');
				return allowed;
			} catch (error) {
				client.log.error.http(error);
				end('access-revoked');
				return false;
			} finally {
				checking = null;
			}
		})());

		const onMessage = async ({
			messageId, ticketId,
		}) => {
			if (ticketId !== ticket.id || closed) return;
			try {
				if (Date.now() - lastCheck >= MESSAGE_ACCESS_CHECK && !await checkAccess()) return;
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
			if (ticketId === ticket.id) end('ticket-closed', { id: ticketId });
		};
		send('ready', { ticketId: ticket.id });
		events.on('message', onMessage);
		events.on('message-deleted', onDeleted);
		events.on('ticket-closed', onClosed);
		const heartbeat = setInterval(() => res.raw.write(': ping\n\n'), HEARTBEAT);
		heartbeat.unref?.();
		const accessTimer = setInterval(checkAccess, ACCESS_CHECK);
		accessTimer.unref?.();

		req.raw.on('close', cleanup);
		res.raw.on('close', cleanup);
		if (!ticket.open) onClosed({ ticketId: ticket.id });
	},
	onRequest: [fastify.authenticate, fastify.isMember],
});

