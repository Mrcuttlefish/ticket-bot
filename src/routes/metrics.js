const pkg = require('../../package.json');
const {
	counters,
	formatMetrics,
	isAuthorised,
} = require('../lib/metrics');

const CACHE_FOR = 30e3;

// Prometheus metrics (upstream #324). Disabled unless METRICS_TOKEN is set; scrape with
// `authorization: { credentials: <token> }` in the Prometheus job.
module.exports.get = () => ({
	handler: async (req, res) => {
		/** @type {import("client")} */
		const client = req.routeOptions.config.client;
		const token = process.env.METRICS_TOKEN;
		if (!token) return res.code(404).send({ message: 'Not Found' });
		if (!isAuthorised(req.headers.authorization, token)) return res.code(401).send({ message: 'Unauthorized' });

		const cacheKey = 'cache/metrics';
		let counts = await client.keyv.get(cacheKey);
		if (!counts) {
			const [categories, openTickets, tickets, tags] = await Promise.all([
				client.prisma.category.count(),
				client.prisma.ticket.count({ where: { open: true } }),
				client.prisma.ticket.count(),
				client.prisma.tag.count(),
			]);
			counts = {
				categories,
				openTickets,
				tags,
				tickets,
			};
			await client.keyv.set(cacheKey, counts, CACHE_FOR);
		}

		const memory = process.memoryUsage();
		const body = formatMetrics([
			{
				help: 'Version information',
				labels: { version: pkg.version },
				name: 'info',
				type: 'gauge',
				value: 1,
			},
			{
				help: 'Seconds since the process started',
				name: 'uptime_seconds',
				type: 'gauge',
				value: Math.round(process.uptime()),
			},
			{
				help: 'Resident memory in bytes',
				name: 'memory_rss_bytes',
				type: 'gauge',
				value: memory.rss,
			},
			{
				help: 'Heap memory used in bytes',
				name: 'memory_heap_used_bytes',
				type: 'gauge',
				value: memory.heapUsed,
			},
			{
				help: 'Discord gateway ping in milliseconds',
				name: 'gateway_ping_milliseconds',
				type: 'gauge',
				value: client.ws.ping,
			},
			{
				help: 'Number of guilds the bot is in',
				name: 'guilds',
				type: 'gauge',
				value: client.guilds.cache.size,
			},
			{
				help: 'Number of ticket categories',
				name: 'categories',
				type: 'gauge',
				value: counts.categories,
			},
			{
				help: 'Number of tags',
				name: 'tags',
				type: 'gauge',
				value: counts.tags,
			},
			{
				help: 'Number of open tickets',
				name: 'tickets_open',
				type: 'gauge',
				value: counts.openTickets,
			},
			{
				help: 'Number of tickets in the database',
				name: 'tickets',
				type: 'gauge',
				value: counts.tickets,
			},
			{
				help: 'Number of tickets marked as stale',
				name: 'tickets_stale',
				type: 'gauge',
				value: client.tickets.$stale.size,
			},
			{
				help: 'Tickets created since the bot started',
				name: 'tickets_created_total',
				type: 'counter',
				value: counters.tickets_created_total,
			},
			{
				help: 'Tickets closed since the bot started',
				name: 'tickets_closed_total',
				type: 'counter',
				value: counters.tickets_closed_total,
			},
		]);
		return res
			.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
			.header('Cache-Control', 'no-store')
			.send(body);
	},
});
