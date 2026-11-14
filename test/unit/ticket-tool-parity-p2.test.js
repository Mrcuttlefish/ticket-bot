const { test } = require('node:test');
const assert = require('node:assert/strict');
const { toButtonEmoji } = require('../../src/lib/buttons');
const { formatLifecycleMessage } = require('../../src/lib/tickets/lifecycle');
const {
	sanitize, schemas,
} = require('../../src/lib/validation');

test('button emojis: unicode, shortcodes and custom emojis', () => {
	assert.equal(toButtonEmoji('🔒'), '🔒');
	assert.equal(toButtonEmoji(':lock:'), '🔒');
	assert.deepEqual(toButtonEmoji('<a:party:123456789012345678>'), {
		animated: true,
		id: '123456789012345678',
		name: 'party',
	});
	assert.deepEqual(toButtonEmoji('123456789012345678'), { id: '123456789012345678' });
	assert.equal(toButtonEmoji(''), undefined);
});

test('lifecycle messages fill {age}, {claimer} and {reason}, and leave them empty when unknown', () => {
	const text = formatLifecycleMessage('#{num} {category}: {reason} ({age}) {claimer}', {
		category: { name: 'Support' },
		now: new Date('2026-01-01T02:00:00Z'),
		reason: 'done',
		ticket: {
			createdAt: new Date('2026-01-01T00:00:00Z'),
			number: 7,
		},
	});
	assert.equal(text, '#7 Support: done (2 hours)');
});

test('validation: button customisation and creator roles', () => {
	const { buttons } = sanitize({
		buttons: {
			close: {
				emoji: '',
				label: ' Done ',
				style: 'SUCCESS',
			},
		},
	}, schemas.guildSettings);
	assert.deepEqual(buttons, {
		close: {
			label: 'Done',
			style: 'SUCCESS',
		},
	});
	assert.throws(() => sanitize({ buttons: { nuke: {} } }, schemas.guildSettings), /expected one of/);
	assert.throws(() => sanitize({ buttons: { close: { style: 'LINK' } } }, schemas.guildSettings), /expected one of/);
	assert.throws(() => sanitize({ creatorRoles: { leave: { add: [] } } }, schemas.category), /expected one of/);
	assert.throws(() => sanitize({ creatorRoles: { open: { add: ['x'] } } }, schemas.category), /Discord ID/);
	assert.deepEqual(sanitize({
		creatorRoles: {
			close: {
				add: [],
				remove: [],
			},
		},
	}, schemas.category).creatorRoles, {}, 'empty changes are dropped');
	assert.throws(() => sanitize({ outOfHours: 'MAYBE' }, schemas.category), /WARN/);
});
