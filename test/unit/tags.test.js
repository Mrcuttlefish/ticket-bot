const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fillTagPlaceholders } = require('../../src/lib/tags');

test('tag placeholders are filled (upstream #438)', () => {
	const out = fillTagPlaceholders('Hi {user} ({user.name}), see {channel} in {server}. Ticket #{ticket.number} by {ticket.creator}. {AUTHOR}', {
		author: { id: '3' },
		channel: { id: '2' },
		guild: { name: 'Guild' },
		ticket: {
			createdById: '4',
			number: 12,
		},
		user: {
			displayName: 'Dee',
			id: '1',
		},
	});
	assert.equal(out, 'Hi <@1> (Dee), see <#2> in Guild. Ticket #12 by <@4>. <@3>');
});

test('unknown or empty placeholders are left alone', () => {
	assert.equal(fillTagPlaceholders('{ticket.number} {nope} {user}', {}), '{ticket.number} {nope} {user}');
	assert.equal(fillTagPlaceholders('{"json": true}', {}), '{"json": true}');
});
