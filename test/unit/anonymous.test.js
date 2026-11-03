const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	anonymiseTranscript, isRelay, shouldRelay,
} = require('../../src/lib/tickets/anonymous');

const message = (overrides = {}) => ({
	attachments: new Map(),
	author: {
		bot: false,
		id: 'staff',
	},
	content: 'hello',
	system: false,
	webhookId: null,
	...overrides,
});

test('only staff messages in anonymous categories are relayed', () => {
	const ticket = {
		category: { anonymous: true },
		createdById: 'creator',
	};
	assert.equal(shouldRelay({
		message: message(),
		staff: true,
		ticket,
	}), true);
	assert.equal(shouldRelay({
		message: message(),
		staff: false,
		ticket,
	}), false, 'not staff');
	assert.equal(shouldRelay({
		message: message(),
		staff: true,
		ticket: {
			...ticket,
			category: { anonymous: false },
		},
	}), false, 'category isn\'t anonymous');
	assert.equal(shouldRelay({
		message: message(),
		staff: true,
		ticket: {
			...ticket,
			category: null,
		},
	}), false, 'no category');
	assert.equal(shouldRelay({
		message: message({
			author: {
				bot: false,
				id: 'creator',
			},
		}),
		staff: true,
		ticket,
	}), false, 'staff who opened the ticket');
	assert.equal(shouldRelay({
		message: message({
			author: {
				bot: true,
				id: 'bot',
			},
		}),
		staff: true,
		ticket,
	}), false, 'bots');
	assert.equal(shouldRelay({
		message: message({ content: '' }),
		staff: true,
		ticket,
	}), false, 'nothing to relay');
	assert.equal(shouldRelay({
		message: message({
			attachments: new Map([['1', {}]]),
			content: '',
		}),
		staff: true,
		ticket,
	}), true, 'attachments only');
});

test('relays are recognised by their nonce', () => {
	assert.equal(isRelay({
		author: { id: 'bot' },
		nonce: 'anon123',
	}, 'bot'), true);
	assert.equal(isRelay({
		author: { id: 'someone' },
		nonce: 'anon123',
	}, 'bot'), false, 'only the bot\'s own messages');
	assert.equal(isRelay({
		author: { id: 'bot' },
		nonce: null,
	}, 'bot'), false);
});

test('transcripts for the creator show staff as "Staff"', () => {
	const creator = {
		bot: false,
		userId: 'creator',
		username: 'Creator',
	};
	const staff = {
		bot: false,
		userId: 'staff',
		username: 'Alice',
	};
	const bot = {
		bot: true,
		userId: 'bot',
		username: 'Tickets',
	};
	const ticket = anonymiseTranscript({
		archivedMessages: [{ author: creator }, { author: staff }, { author: bot }],
		archivedUsers: [creator, staff, bot],
		claimedBy: staff,
		closedBy: creator,
		createdById: 'creator',
	}, 'Staff');
	assert.deepEqual(ticket.archivedMessages.map(m => m.author.username), ['Creator', 'Staff', 'Tickets']);
	assert.equal(ticket.claimedBy.username, 'Staff');
	assert.equal(ticket.closedBy.username, 'Creator');
	assert.ok(!JSON.stringify(ticket).includes('Alice'), 'the staff member\'s name is gone');
	assert.ok(!JSON.stringify(ticket).includes('"staff"'), 'and their ID');
});
