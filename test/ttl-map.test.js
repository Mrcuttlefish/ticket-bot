const { test } = require('node:test');
const assert = require('node:assert/strict');
const Keyv = require('keyv');
const TTLMap = require('../src/lib/ttl-map');

test('expired keys are swept even if never read again (upstream #659)', async () => {
	const store = new TTLMap(60_000);
	const keyv = new Keyv({ store });
	await keyv.set('ratelimits/a', true, 10);
	await keyv.set('permanent', 1);
	assert.equal(store.size, 2);
	assert.equal(store.sweep(Date.now() + 20), 1);
	assert.equal(store.size, 1);
	assert.equal(await keyv.get('permanent'), 1);
	assert.equal(await keyv.get('ratelimits/a'), undefined);
});

test('overwriting without a TTL clears the old expiry', async () => {
	const store = new TTLMap(60_000);
	const keyv = new Keyv({ store });
	await keyv.set('k', 1, 10);
	await keyv.set('k', 2);
	store.sweep(Date.now() + 20);
	assert.equal(await keyv.get('k'), 2);
});

test('deleting and clearing keep the expiry index in sync', async () => {
	const store = new TTLMap(60_000);
	const keyv = new Keyv({ store });
	await keyv.set('a', 1, 1000);
	await keyv.delete('a');
	assert.equal(store.expiries.size, 0);
	await keyv.set('b', 1, 1000);
	await keyv.clear();
	assert.equal(store.expiries.size, 0);
});
