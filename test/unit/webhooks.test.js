const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createHmac } = require('node:crypto');
const {
	checkWebhookURL,
	isPublicAddress,
	safeLookup,
	sendWebhook,
} = require('../../src/lib/webhooks');

const withEnv = async (value, fn) => {
	const previous = process.env.WEBHOOKS_ALLOW_PRIVATE;
	if (value === undefined) delete process.env.WEBHOOKS_ALLOW_PRIVATE;
	else process.env.WEBHOOKS_ALLOW_PRIVATE = value;
	try {
		return await fn();
	} finally {
		if (previous === undefined) delete process.env.WEBHOOKS_ALLOW_PRIVATE;
		else process.env.WEBHOOKS_ALLOW_PRIVATE = previous;
	}
};

test('private and reserved addresses are not public', () => {
	for (const address of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '0.0.0.0', '100.64.0.1', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::127.0.0.1', 'not-an-ip']) {
		assert.equal(isPublicAddress(address), false, address);
	}
	for (const address of ['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111', '::ffff:1.1.1.1']) {
		assert.equal(isPublicAddress(address), true, address);
	}
});

test('webhook URLs must be public HTTPS URLs', () => withEnv(undefined, () => {
	assert.equal(checkWebhookURL('https://example.com/hook').ok, true);
	for (const url of [
		'http://example.com/hook',
		'https://127.0.0.1/',
		'https://2130706433/', // 127.0.0.1 as a number
		'https://[::1]/',
		'https://[::ffff:127.0.0.1]/',
		'https://169.254.169.254/latest/meta-data',
		'https://localhost/',
		'https://api.localhost/',
		'https://user:pass@example.com/',
		'file:///etc/passwd',
		'not a url',
		'https://example.com/' + 'a'.repeat(2048),
	]) {
		assert.equal(checkWebhookURL(url).ok, false, url);
	}
}));

test('self-hosters can allow private HTTP webhooks', () => withEnv('true', () => {
	assert.equal(checkWebhookURL('http://127.0.0.1:8080/hook').ok, true);
	assert.equal(checkWebhookURL('ftp://127.0.0.1/').ok, false);
}));

test('DNS results are checked when connecting', () => withEnv(undefined, () => new Promise(resolve => {
	safeLookup('localhost', {}, error => {
		assert.equal(error?.code, 'EWEBHOOKBLOCKED');
		resolve();
	});
})));

test('sends signed JSON and does not follow redirects', () => withEnv('true', async () => {
	const received = [];
	const server = http.createServer((req, res) => {
		let body = '';
		req.on('data', chunk => (body += chunk));
		req.on('end', () => {
			received.push({
				body,
				headers: req.headers,
				url: req.url,
			});
			if (req.url === '/redirect') {
				res.writeHead(302, { Location: '/elsewhere' }).end();
			} else {
				res.writeHead(204).end();
			}
		});
	});
	await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
	const { port } = server.address();
	try {
		const status = await sendWebhook(`http://127.0.0.1:${port}/hook`, { event: 'ticket.created' }, 'secret');
		assert.equal(status, 204);
		const [request] = received;
		assert.equal(request.body, '{"event":"ticket.created"}');
		assert.equal(request.headers['content-type'], 'application/json');
		assert.equal(request.headers['x-signature-256'], 'sha256=' + createHmac('sha256', 'secret').update(request.body).digest('hex'));

		assert.equal(await sendWebhook(`http://127.0.0.1:${port}/redirect`, {}), 302);
		assert.equal(received.length, 2); // the redirect wasn't followed
	} finally {
		server.close();
	}
}));

test('sending to a private address is refused', () => withEnv(undefined, async () => {
	await assert.rejects(sendWebhook('http://127.0.0.1:1/hook', {}), /Invalid webhook URL/);
	await assert.rejects(sendWebhook('https://127.0.0.1:1/hook', {}), /Invalid webhook URL/);
}));

test('the webhook secret is write-only', async () => {
	const {
		MASK, maskWebhookSecret, prepareWebhookSecret,
	} = require('../../src/lib/webhook-secret');
	assert.deepEqual(maskWebhookSecret({
		id: '1',
		webhookSecret: 'encrypted',
	}), {
		id: '1',
		webhookSecret: MASK,
	});
	assert.deepEqual(maskWebhookSecret({ webhookSecret: null }), { webhookSecret: null });
	assert.deepEqual(await prepareWebhookSecret({ webhookSecret: MASK }), {}); // unchanged
	assert.deepEqual(await prepareWebhookSecret({ webhookSecret: null }), { webhookSecret: null }); // removed
	assert.deepEqual(await prepareWebhookSecret({ webhookSecret: 'new' }, async t => `enc(${t})`), { webhookSecret: 'enc(new)' });
});

test('webhook payloads include decrypted answers and close details', () => {
	const { buildPayload } = require('../../src/lib/tickets/webhook-events');
	const ticket = {
		category: {
			id: 3,
			name: 'Support',
		},
		closedAt: new Date(0),
		closedById: '2',
		closedReason: 'done',
		createdAt: new Date(0),
		createdById: '1',
		guild: { webhookSecret: 'should not leak' },
		guildId: '9',
		id: '5',
		number: 7,
		questionAnswers: [{
			question: { label: 'Order ID' },
			questionId: 'q1',
			value: '1234',
		}],
		topic: 'help',
	};
	const created = buildPayload('ticket.created', ticket);
	assert.deepEqual(created.ticket.answers, [{
		question: 'Order ID',
		questionId: 'q1',
		value: '1234',
	}]);
	assert.equal(created.ticket.closedReason, undefined);
	assert.equal(JSON.stringify(created).includes('should not leak'), false);
	assert.equal(buildPayload('ticket.closed', ticket).ticket.closedReason, 'done');
});
