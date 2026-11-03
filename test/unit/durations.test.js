const { test } = require('node:test');
const assert = require('node:assert/strict');
const middleware = require('../../src/lib/middleware/prisma-durations');

const DAY = 86_400_000;

test('writes are converted to seconds and reads back to milliseconds', async () => {
	let seen;
	const result = await middleware({
		action: 'update',
		args: {
			data: {
				autoClose: 30 * DAY,
				name: 'x',
				staleAfter: null,
			},
			where: { id: '1' },
		},
		model: 'Guild',
	}, async params => {
		seen = structuredClone(params.args);
		return {
			autoClose: params.args.data.autoClose,
			id: '1',
			staleAfter: null,
		};
	});
	assert.deepEqual(seen.data, {
		autoClose: 30 * 86_400,
		name: 'x',
		staleAfter: null,
	});
	assert.deepEqual(result, {
		autoClose: 30 * DAY,
		id: '1',
		staleAfter: null,
	});
});

test('30 days no longer overflows a 32-bit column (upstream #530, #673)', () => {
	assert.ok(middleware.toSeconds(30 * DAY) < 2 ** 31);
	assert.ok(middleware.toSeconds(365 * 10 * DAY) < 2 ** 31);
});

test('filters, nested results and selects are handled', async () => {
	let seen;
	const result = await middleware({
		action: 'findMany',
		args: {
			include: { categories: { select: { cooldown: true } } },
			select: undefined,
			where: { staleAfter: { gte: 60_000 } },
		},
		model: 'Guild',
	}, async params => {
		seen = structuredClone(params.args);
		return [{
			categories: [{ cooldown: 3600 }],
			staleAfter: 120,
		}];
	});
	assert.deepEqual(seen.where, { staleAfter: { gte: 60 } });
	assert.deepEqual(seen.include, { categories: { select: { cooldown: true } } });
	assert.deepEqual(result, [{
		categories: [{ cooldown: 3_600_000 }],
		staleAfter: 120_000,
	}]);
});

test('sub-second values round up to one second, not zero', () => {
	assert.equal(middleware.toSeconds(1), 1);
	assert.equal(middleware.toSeconds(0), 0);
	assert.equal(middleware.toSeconds(1499), 1);
	assert.equal(middleware.toSeconds(1500), 2);
});

test('unrelated fields and dates are untouched', async () => {
	const date = new Date();
	const result = await middleware({
		action: 'findUnique',
		args: { where: { id: '1' } },
	}, async () => ({
		createdAt: date,
		ratelimit: 10,
	}));
	assert.equal(result.createdAt, date);
	assert.equal(result.ratelimit, 10); // slow mode is already in seconds and isn't converted
});
