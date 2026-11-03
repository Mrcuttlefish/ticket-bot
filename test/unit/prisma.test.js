const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	getMiddlewares, runMiddlewares,
} = require('../../src/lib/prisma');

test('middlewares run in order around the query, like $use did', async () => {
	const calls = [];
	const mw = name => async (params, next) => {
		calls.push(`${name}:before:${params.model}.${params.action}`);
		params.args.seen = [...(params.args.seen ?? []), name];
		const result = await next(params);
		calls.push(`${name}:after`);
		return {
			...result,
			wrapped: [...(result.wrapped ?? []), name],
		};
	};
	const result = await runMiddlewares([mw('outer'), mw('inner')], {
		args: { where: { id: 1 } },
		model: 'Guild',
		operation: 'findUnique',
		query: async args => {
			calls.push(`query:${args.seen.join(',')}`);
			return { id: 1 };
		},
	});
	assert.deepEqual(calls, ['outer:before:Guild.findUnique', 'inner:before:Guild.findUnique', 'query:outer,inner', 'inner:after', 'outer:after']);
	assert.deepEqual(result, {
		id: 1,
		wrapped: ['inner', 'outer'],
	});
});

test('durations are converted on every provider, JSON only on SQLite', async () => {
	assert.equal(getMiddlewares('mysql').length, 1);
	assert.equal(getMiddlewares('postgresql').length, 1);
	assert.equal(getMiddlewares('sqlite').length, 2);

	let stored;
	const result = await runMiddlewares(getMiddlewares('sqlite'), {
		args: {
			data: {
				autoClose: 3600000,
				blocklist: ['1'],
			},
		},
		model: 'Guild',
		operation: 'update',
		query: async args => {
			stored = { ...args.data };
			return args.data;
		},
	});
	assert.deepEqual(stored, {
		autoClose: 3600,
		blocklist: '["1"]',
	});
	assert.deepEqual(result, {
		autoClose: 3600000,
		blocklist: ['1'],
	});
});
