const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	API_KEY_LIFETIME, getJWTSecret, isTokenCurrent,
} = require('../src/lib/jwt-secret');

const KEY = 'a'.repeat(48);

test('the JWT secret is derived from, not equal to, the encryption key (S10)', () => {
	const secret = getJWTSecret(KEY);
	assert.equal(secret.length, 32);
	assert.notEqual(secret.toString(), KEY);
	assert.equal(secret.includes(Buffer.from(KEY.slice(0, 16))), false);
	assert.deepEqual(getJWTSecret(KEY), secret); // stable across restarts
	assert.notDeepEqual(getJWTSecret('b'.repeat(48)), secret);
	assert.throws(() => getJWTSecret(''));
});

test('API keys expire after a year (S11)', () => {
	assert.equal(API_KEY_LIFETIME, 365 * 24 * 60 * 60 * 1000);
});

test('the auth hook rejects tokens without an expiry', async () => {
	const Fastify = require('fastify');
	const app = Fastify();
	app.register(require('@fastify/jwt'), { secret: getJWTSecret(KEY) });
	await app.after();
	// the same checks as fastify.authenticate in src/http.js, with the secret it uses
	app.get('/', async (req, res) => {
		try {
			const data = await req.jwtVerify();
			if (!isTokenCurrent(data)) throw 'expired';
			return { ok: true };
		} catch {
			return res.code(401).send({ ok: false });
		}
	});
	const call = token => app.inject({
		headers: { authorization: `Bearer ${token}` },
		url: '/',
	});
	assert.equal((await call(app.jwt.sign({ expiresAt: Date.now() + 1e4 }))).statusCode, 200);
	assert.equal((await call(app.jwt.sign({ service: true }))).statusCode, 401); // old-style API key
	assert.equal((await call(app.jwt.sign({ expiresAt: Date.now() - 1 }))).statusCode, 401);
	// a token signed with the raw encryption key (before S10) is rejected
	const old = Fastify();
	old.register(require('@fastify/jwt'), { secret: KEY });
	await old.ready();
	assert.equal((await call(old.jwt.sign({ expiresAt: Date.now() + 1e4 }))).statusCode, 401);
	await app.close();
	await old.close();
});

test('INVALIDATE_TOKENS still works', () => {
	const now = Date.parse('2026-11-03T00:00:00Z');
	const token = {
		createdAt: Date.parse('2026-11-01T00:00:00Z'),
		expiresAt: now + 1,
	};
	assert.equal(isTokenCurrent(token, undefined, now), true);
	assert.equal(isTokenCurrent(token, '2026-11-02', now), false);
	assert.equal(isTokenCurrent(token, '2026-10-01', now), true);
	assert.equal(isTokenCurrent(null, undefined, now), false);
});
