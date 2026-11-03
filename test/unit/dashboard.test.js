const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.join(__dirname, '../../dashboard');

test('the vendored dashboard records which ticket-portal commit it was built from', () => {
	assert.match(fs.readFileSync(path.join(root, 'COMMIT'), 'utf8').trim(), /^[0-9a-f]{40}$/);
});

test('the vendored dashboard handler loads and serves its assets', async () => {
	process.env.ORIGIN ??= 'http://localhost';
	const { handler } = await import(path.join(root, 'build/handler.js'));
	assert.equal(typeof handler, 'function');

	const server = http.createServer((req, res) => handler(req, res, () => {
		res.statusCode = 404;
		res.end();
	}));
	await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
	try {
		const { port } = server.address();
		const response = await fetch(`http://127.0.0.1:${port}/favicon.png`);
		assert.equal(response.status, 200);
		assert.match(response.headers.get('content-type'), /image\/png/);
	} finally {
		server.close();
	}
});
