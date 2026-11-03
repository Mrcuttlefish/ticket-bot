/**
 * Prometheus metrics (upstream #324).
 * Counters live in memory, so they reset when the bot restarts (Prometheus handles this).
 */

const { timingSafeEqual } = require('node:crypto');

const counters = {
	tickets_closed_total: 0,
	tickets_created_total: 0,
};

/**
 * @param {keyof counters} name
 * @param {number} [by]
 */
function increment(name, by = 1) {
	counters[name] += by;
}

const escapeLabel = value => String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');

/**
 * Format metrics in the Prometheus text exposition format.
 * @param {{ name: string, help: string, type: 'counter' | 'gauge', value: number, labels?: Record<string, string> }[]} metrics
 * @returns {string}
 */
function formatMetrics(metrics) {
	const lines = [];
	for (const metric of metrics) {
		if (!/^[a-zA-Z_:][a-zA-Z0-9_:]*$/.test(metric.name)) throw new Error(`Invalid metric name: ${metric.name}`);
		const name = `discord_tickets_${metric.name}`;
		lines.push(`# HELP ${name} ${metric.help}`, `# TYPE ${name} ${metric.type}`);
		const labels = Object.entries(metric.labels ?? {})
			.map(([key, value]) => `${key}="${escapeLabel(value)}"`)
			.join(',');
		const value = Number.isFinite(metric.value) ? metric.value : 0;
		lines.push(`${name}${labels ? `{${labels}}` : ''} ${value}`);
	}
	return lines.join('\n') + '\n';
}

/**
 * Check a request's `Authorization: Bearer <token>` header against METRICS_TOKEN, in constant time.
 * @param {string | undefined} header
 * @param {string | undefined} token
 * @returns {boolean}
 */
function isAuthorised(header, token) {
	if (!token) return false;
	const expected = Buffer.from(`Bearer ${token}`);
	const actual = Buffer.from(String(header ?? ''));
	return actual.length === expected.length && timingSafeEqual(actual, expected);
}

module.exports = {
	counters,
	formatMetrics,
	increment,
	isAuthorised,
};
