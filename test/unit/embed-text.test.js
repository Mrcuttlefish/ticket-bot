const { test } = require('node:test');
const assert = require('node:assert/strict');
const { embedToText } = require('../../src/lib/tickets/embed-text');

test('archived embeds are rendered as text (upstream #504)', () => {
	const text = embedToText({
		data: {
			description: 'Line 1\nLine 2',
			fields: [{
				name: 'Priority',
				value: 'High',
			}],
			footer: { text: 'Footer' },
			title: 'Ticket closed',
		},
	});
	assert.equal(text, '[embed] **Ticket closed**\n\tLine 1\n\tLine 2\n\tPriority: High\n\tFooter');
});

test('empty or unknown embeds fall back to a placeholder', () => {
	assert.equal(embedToText({ data: {} }), '[embedded content]');
	assert.equal(embedToText(null), '[embedded content]');
});
