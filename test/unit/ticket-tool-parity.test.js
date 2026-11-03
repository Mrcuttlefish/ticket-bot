const { test } = require('node:test');
const assert = require('node:assert/strict');
const { OverwriteType } = require('discord.js');
const {
	getChannelDeleteAt, getMembersToLock, getMembersToUnlock, keepsClosedChannels,
} = require('../../src/lib/tickets/closed');
const { transcriptTargets } = require('../../src/lib/tickets/transcript-file');
const { isLogged } = require('../../src/lib/logging');
const {
	DETAILS_MARK, buildOpeningMessage, editOpeningDetails, getAllowedMentions,
} = require('../../src/lib/tickets/opening-message');
const { formatChannelName } = require('../../src/lib/tickets/placeholders');
const {
	sanitize, sanitizeCategory, schemas,
} = require('../../src/lib/validation');

const overwrite = (id, type, deny = []) => ({
	deny: { has: p => deny.includes(p) },
	id,
	type,
});

test('keepClosedFor: null deletes the channel at close, 0 keeps it, more keeps it for a while', () => {
	assert.equal(keepsClosedChannels({ keepClosedFor: null }), false);
	assert.equal(keepsClosedChannels({}), false);
	assert.equal(keepsClosedChannels(null), false);
	assert.equal(keepsClosedChannels({ keepClosedFor: 0 }), true);
	const closedAt = new Date('2026-01-01T00:00:00Z');
	assert.equal(getChannelDeleteAt(closedAt, 0), null);
	assert.equal(getChannelDeleteAt(closedAt, null), null);
	assert.deepEqual(getChannelDeleteAt(closedAt, 60000), new Date('2026-01-01T00:01:00Z'));
});

test('locking a closed ticket skips roles, the bot and staff', () => {
	const overwrites = [
		overwrite('everyone', OverwriteType.Role, ['ViewChannel']),
		overwrite('staffRole', OverwriteType.Role),
		overwrite('bot', OverwriteType.Member),
		overwrite('creator', OverwriteType.Member),
		overwrite('added', OverwriteType.Member),
		overwrite('claimer', OverwriteType.Member),
	];
	assert.deepEqual(getMembersToLock(overwrites, {
		botId: 'bot',
		isStaffId: id => id === 'claimer',
	}), ['creator', 'added']);
});

test('reopening gives access back to locked members, and always to the creator', () => {
	const overwrites = [
		overwrite('added', OverwriteType.Member, ['ViewChannel']),
		overwrite('other', OverwriteType.Member),
		overwrite('everyone', OverwriteType.Role, ['ViewChannel']),
	];
	assert.deepEqual(getMembersToUnlock(overwrites, {
		botId: 'bot',
		creatorId: 'creator',
		isStaffId: () => false,
	}), ['added', 'creator']);
});

test('transcript files are only made for archived tickets', () => {
	const guild = {
		transcriptChannel: '123456789012345678',
		transcriptDm: true,
	};
	assert.deepEqual(transcriptTargets({ archive: true }, guild), {
		channel: true,
		dm: true,
	});
	assert.deepEqual(transcriptTargets({ archive: false }, guild), {
		channel: false,
		dm: false,
	});
	assert.deepEqual(transcriptTargets({ archive: true }, {}), {
		channel: false,
		dm: false,
	});
});

test('log exclusions match events, or every event of a kind', () => {
	assert.equal(isLogged([], 'ticket.close'), true);
	assert.equal(isLogged(null, 'ticket.close'), true);
	assert.equal(isLogged(['ticket.claim'], 'ticket.claim'), false);
	assert.equal(isLogged(['ticket.claim'], 'ticket.close'), true);
	assert.equal(isLogged(['admin'], 'admin'), false);
});

test('validation: the new settings', () => {
	assert.deepEqual(sanitize({
		logExclude: ['ticket.claim', 'admin', 'ticket.claim'],
		transcriptChannel: '123456789012345678',
		transcriptDm: true,
	}, schemas.guildSettings), {
		logExclude: ['ticket.claim', 'admin'],
		transcriptChannel: '123456789012345678',
		transcriptDm: true,
	});
	assert.throws(() => sanitize({ logExclude: ['ticket.everything'] }, schemas.guildSettings), /logExclude/);
	assert.throws(() => sanitize({ logExclude: 'admin' }, schemas.guildSettings), /logExclude/);
	assert.throws(() => sanitize({ transcriptChannel: 'general' }, schemas.guildSettings), /transcriptChannel/);

	const { data } = sanitizeCategory({
		claimedCategory: '123456789012345678',
		claimedChannelName: 'claimed-{num}',
		claimHide: false,
		claimReleaseLocked: true,
		claimTakeover: true,
		keepClosedFor: 3600000,
		openingStyle: 'TEXT',
	});
	assert.equal(data.keepClosedFor, 3600000);
	assert.equal(data.openingStyle, 'TEXT');
	assert.equal(data.claimHide, false);
	assert.equal(sanitizeCategory({ keepClosedFor: null }).data.keepClosedFor, null);
	assert.throws(() => sanitizeCategory({ openingStyle: 'HTML' }), /openingStyle/);
	assert.throws(() => sanitizeCategory({ keepClosedFor: -1 }), /keepClosedFor/);
	assert.throws(() => sanitizeCategory({ claimedChannelName: 'x'.repeat(101) }), /claimedChannelName/);
});

test('channel names can include the claimer', () => {
	assert.equal(formatChannelName('{claimer}-{num}', {
		claimer: 'alex',
		displayName: 'A',
		number: 7,
		username: 'a',
	}), 'alex-7');
	assert.equal(formatChannelName('ticket-{num}', {
		displayName: 'A',
		number: 7,
		username: 'a',
	}), 'ticket-7');
});

test('text opening messages only ping the mentions line, and fit in 2000 characters', () => {
	assert.deepEqual(getAllowedMentions('<@&111111111111111111>, <@222222222222222222> has created a new ticket'), {
		parse: [],
		roles: ['111111111111111111'],
		users: ['222222222222222222'],
	});
	const message = buildOpeningMessage({
		author: { name: 'Alex' },
		colour: 'Blurple',
		content: '<@222222222222222222> has created a new ticket',
		description: 'x'.repeat(5000),
		fields: [{
			name: 'Topic',
			value: '@everyone <@333333333333333333>',
		}],
		style: 'TEXT',
	});
	assert.ok(message.content.length <= 2000);
	assert.equal(message.embeds, undefined);
	assert.deepEqual(message.allowedMentions.users, ['222222222222222222']);
	assert.ok(message.content.endsWith('**Topic**\n@everyone <@333333333333333333>'));
});

test('off opening messages leave out the opening text but keep the details', () => {
	const message = buildOpeningMessage({
		author: { name: 'Alex' },
		colour: 'Blurple',
		content: 'mentions',
		description: 'Welcome!',
		fields: [],
		image: 'https://example.com/a.png',
		style: 'OFF',
	});
	assert.equal(message.content, 'mentions' + DETAILS_MARK);
});

test('the details of text opening messages can be edited', async () => {
	const edits = [];
	const message = {
		content: 'head' + DETAILS_MARK + '**Topic**\nold',
		edit: async data => edits.push(data),
		embeds: [],
		flags: { has: () => false },
	};
	assert.equal(await editOpeningDetails(message, [{
		name: 'Topic',
		value: 'new',
	}]), true);
	assert.equal(edits[0].content, 'head' + DETAILS_MARK + '**Topic**\nnew');
	assert.deepEqual(edits[0].allowedMentions, { parse: [] });
});

test('audit: members can\'t add a second details marker or markdown through their name', () => {
	const message = buildOpeningMessage({
		author: { name: '**[click](https://example.com)**' },
		colour: 'Blurple',
		content: 'mentions',
		description: 'Topic: a​b',
		fields: [{
			name: 'Topic',
			value: 'x' + DETAILS_MARK + 'y',
		}],
		style: 'TEXT',
	});
	assert.equal(message.content.split(DETAILS_MARK).length, 2);
	assert.ok(message.content.includes('\\*\\*\\[click\\]'));
});
