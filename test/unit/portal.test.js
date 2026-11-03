const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	RateLimit, STAFF_AUTHOR, checkWriteRequest, getPermissions, isExpired, refreshAttachments, serializeTicket,
} = require('../../src/lib/tickets/portal');

test('isExpired reads Discord\'s hex expiry', () => {
	const now = 1_700_000_000_000;
	const at = seconds => `https://cdn.discordapp.com/attachments/1/2/a.png?ex=${Math.floor(seconds).toString(16)}&is=0&hm=0`;
	assert.equal(isExpired(at(now / 1000 - 10), now), true);
	assert.equal(isExpired(at(now / 1000 + 30), now), true, 'within a minute counts as expired');
	assert.equal(isExpired(at(now / 1000 + 3600), now), false);
	assert.equal(isExpired('https://example.com/a.png', now), false, 'no ex parameter');
	assert.equal(isExpired('not a url', now), false);
});

test('refreshAttachments swaps in fresh URLs and marks the rest expired', async () => {
	const old = 'https://cdn.discordapp.com/a.png?ex=1';
	const gone = 'https://cdn.discordapp.com/b.png?ex=1';
	const attachments = [{ url: old }, { url: gone }, { url: 'https://cdn.discordapp.com/c.png' }];
	const client = {
		rest: {
			post: async (route, { body }) => ({
				refreshed_urls: body.attachment_urls.filter(u => u === old).map(u => ({
					original: u,
					refreshed: `${u}&new`,
				})),
			}),
		},
	};
	await refreshAttachments(client, attachments);
	assert.equal(attachments[0].url, `${old}&new`);
	assert.equal(attachments[1].expired, true);
	assert.equal(attachments[2].expired, undefined, 'fresh URLs are left alone');

	const failing = [{ url: old }];
	await refreshAttachments({
		log: { verbose: {} },
		rest: {
			post: async () => {
				throw new Error('nope');
			},
		},
	}, failing);
	assert.equal(failing[0].expired, true);
});

test('RateLimit allows a number of requests per window, per key', () => {
	const limit = new RateLimit(2, 1000);
	assert.equal(limit.take('a', 0), true);
	assert.equal(limit.take('a', 10), true);
	assert.equal(limit.take('a', 20), false);
	assert.equal(limit.take('b', 20), true, 'keys are separate');
	assert.equal(limit.take('a', 1001), true, 'the window slides');
});

test('checkWriteRequest: JSON only, and cookie requests must come from the portal', () => {
	process.env.HTTP_EXTERNAL = 'https://tickets.example.com/';
	const req = headers => ({ headers });
	assert.match(checkWriteRequest(req({})), /application\/json/);
	assert.match(checkWriteRequest(req({ 'content-type': 'application/json' })), /portal/);
	assert.match(checkWriteRequest(req({
		'content-type': 'application/json',
		'origin': 'https://tickets.example.com.evil.net',
	})), /portal/);
	assert.equal(checkWriteRequest(req({
		'content-type': 'application/json; charset=utf-8',
		'origin': 'https://tickets.example.com',
	})), null);
	assert.equal(checkWriteRequest(req({
		'authorization': 'Bearer x',
		'content-type': 'application/json',
	})), null, 'API keys can\'t be forged by another site');
});

test('permissions and anonymous staff in tickets', async () => {
	const ticket = {
		category: { anonymous: true },
		claimedById: '2',
		closedById: '1',
		createdById: '1',
		open: true,
	};
	assert.deepEqual(getPermissions(ticket, '1', false), {
		canClose: true,
		canReply: true,
		isStaff: false,
	});
	assert.equal(getPermissions({
		...ticket,
		open: false,
	}, '1', false).canReply, false);
	const hidden = await serializeTicket(ticket, false);
	assert.equal(hidden.claimedById, STAFF_AUTHOR.id);
	assert.equal(hidden.closedById, '1', 'the creator isn\'t hidden');
	assert.equal((await serializeTicket(ticket, true)).claimedById, '2');
});
