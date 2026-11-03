const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	formatChannelName,
	formatChannelTopic,
	formatOpeningMessage,
} = require('../src/lib/tickets/placeholders');

test('channel names support zero-padded numbers (upstream #543)', () => {
	const values = {
		displayName: 'Dee',
		number: 12,
		username: 'dee',
	};
	assert.equal(formatChannelName('ticket-{num}', values), 'ticket-12');
	assert.equal(formatChannelName('ticket-{num:4}', values), 'ticket-0012');
	assert.equal(formatChannelName('{username}-{number:3}-{displayname}', values), 'dee-012-Dee');
	assert.equal(formatChannelName('ticket-{num}', {
		...values,
		number: 1488,
	}), 'ticket-1487b');
});

test('opening message placeholders (upstream #448)', () => {
	const creator = {
		displayName: 'Dee',
		toString: () => '<@1>',
		user: { username: 'dee' },
	};
	const out = formatOpeningMessage('Hi {name} / {mention} / {displayname}. {category}: {description}. #{num:3} {topic} {avgResponseTime} {unknown}', {
		avgResponseTime: '5 minutes',
		category: {
			description: 'Get help',
			name: 'Support',
		},
		creator,
		number: 7,
		topic: 'Login broken',
	});
	assert.equal(out, 'Hi <@1> / <@1> / Dee. Support: Get help. #007 Login broken 5 minutes {unknown}');
});

test('channel topic modes (upstream #683)', () => {
	assert.equal(formatChannelTopic(undefined, '<@1>', 'help'), '<@1> | help');
	assert.equal(formatChannelTopic('full', '<@1>', ''), '<@1>');
	assert.equal(formatChannelTopic('creator', '<@1>', 'help'), '<@1>');
	assert.equal(formatChannelTopic('topic', '<@1>', 'help'), 'help');
	assert.equal(formatChannelTopic('none', '<@1>', 'help'), null);
});
