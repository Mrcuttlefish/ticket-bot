const { test } = require('node:test');
const assert = require('node:assert/strict');
const dashboard = require('../../grafana/dashboard.json');
const { useTestClient } = require('../helpers/client');
const { createTestAPI } = require('../helpers/api');

const ctx = useTestClient();

test('the Grafana dashboard only uses metrics that /metrics serves (upstream #363)', async t => {
	process.env.METRICS_TOKEN = 'grafana-test-token';
	t.after(() => delete process.env.METRICS_TOKEN);
	const { app } = await createTestAPI(ctx.client);
	const res = await app.inject({
		headers: { authorization: 'Bearer grafana-test-token' },
		url: '/metrics',
	});
	assert.equal(res.statusCode, 200, res.body);
	const served = new Set(res.body.split('\n').filter(line => line && !line.startsWith('#')).map(line => line.match(/^[a-z_]+/)[0]));

	const queries = [
		...dashboard.panels.flatMap(panel => (panel.targets ?? []).map(target => target.expr)),
		...dashboard.templating.list.map(variable => variable.query.query ?? variable.query),
	];
	assert.ok(queries.length > 10);
	const used = new Set(queries.flatMap(query => query.match(/discord_tickets_[a-z_]+/g) ?? []));
	for (const metric of used) assert.ok(served.has(metric), `${metric} isn't served`);
	for (const metric of served) assert.ok(used.has(metric), `${metric} isn't on the dashboard`);

	// panels don't overlap
	const cells = new Set();
	for (const {
		gridPos: {
			h, w, x, y,
		},
	} of dashboard.panels) {
		assert.ok(x + w <= 24, 'fits the 24-column grid');
		for (let i = x; i < x + w; i++) {
			for (let j = y; j < y + h; j++) {
				assert.ok(!cells.has(`${i},${j}`), `overlap at ${i},${j}`);
				cells.add(`${i},${j}`);
			}
		}
	}
	assert.equal(new Set(dashboard.panels.map(p => p.id)).size, dashboard.panels.length, 'unique panel IDs');
	await app.close();
});
