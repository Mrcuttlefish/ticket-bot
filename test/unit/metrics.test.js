const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	counters,
	formatMetrics,
	increment,
	isAuthorised,
} = require('../../src/lib/metrics');

test('formats Prometheus text', () => {
	const text = formatMetrics([
		{
			help: 'Version information',
			labels: { version: '4.0.52"\n' },
			name: 'info',
			type: 'gauge',
			value: 1,
		},
		{
			help: 'Open tickets',
			name: 'tickets_open',
			type: 'gauge',
			value: NaN,
		},
	]);
	assert.equal(text, [
		'# HELP discord_tickets_info Version information',
		'# TYPE discord_tickets_info gauge',
		'discord_tickets_info{version="4.0.52\\"\\n"} 1',
		'# HELP discord_tickets_tickets_open Open tickets',
		'# TYPE discord_tickets_tickets_open gauge',
		'discord_tickets_tickets_open 0',
		'',
	].join('\n'));
	assert.throws(() => formatMetrics([{
		help: 'x',
		name: 'bad name',
		type: 'gauge',
		value: 1,
	}]));
});

test('counters increment', () => {
	const before = counters.tickets_created_total;
	increment('tickets_created_total');
	assert.equal(counters.tickets_created_total, before + 1);
});

test('metrics need the bearer token', () => {
	const token = 'a-long-random-metrics-token';
	assert.equal(isAuthorised(`Bearer ${token}`, token), true);
	assert.equal(isAuthorised(`Bearer ${token}x`, token), false);
	assert.equal(isAuthorised(token, token), false);
	assert.equal(isAuthorised(undefined, token), false);
	assert.equal(isAuthorised('Bearer ', ''), false); // disabled
	assert.equal(isAuthorised('Bearer undefined', undefined), false);
});

test('/metrics route is off by default and needs the token', async () => {
	const route = require('../../src/routes/metrics').get();
	const client = {
		guilds: { cache: new Map([['1', {}]]) },
		keyv: {
			get: async () => null,
			set: async () => {},
		},
		prisma: {
			category: { count: async () => 2 },
			tag: { count: async () => 3 },
			ticket: { count: async args => (args?.where?.open ? 4 : 10) },
		},
		tickets: { $stale: new Map() },
		ws: { ping: 42 },
	};
	const call = async headers => {
		const res = {
			body: null,
			code(c) {
				this.status = c;
				return this;
			},
			header(k, v) {
				this.headers[k] = v;
				return this;
			},
			headers: {},
			send(b) {
				this.body = b;
				return this;
			},
			status: 200,
		};
		await route.handler({
			headers,
			routeOptions: { config: { client } },
		}, res);
		return res;
	};

	const previous = process.env.METRICS_TOKEN;
	try {
		delete process.env.METRICS_TOKEN;
		assert.equal((await call({ authorization: 'Bearer anything' })).status, 404);

		process.env.METRICS_TOKEN = 'a-long-random-metrics-token';
		assert.equal((await call({})).status, 401);
		const ok = await call({ authorization: 'Bearer a-long-random-metrics-token' });
		assert.equal(ok.status, 200);
		assert.match(ok.body, /^discord_tickets_tickets_open 4$/m);
		assert.match(ok.body, /^discord_tickets_guilds 1$/m);
		assert.match(ok.body, /^discord_tickets_gateway_ping_milliseconds 42$/m);
	} finally {
		if (previous === undefined) delete process.env.METRICS_TOKEN;
		else process.env.METRICS_TOKEN = previous;
	}
});
