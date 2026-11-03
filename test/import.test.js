const { test } = require('node:test');
const assert = require('node:assert/strict');
const { importTicket } = require('../src/lib/import');

const encrypt = s => `enc(${s})`;
const GUILD = '100000000000000001';
const USER = '200000000000000002';
const OTHER_GUILD_TICKET = '300000000000000003';

const exported = () => ({
	archivedChannels: [{
		channelId: '400000000000000004',
		name: 'general',
		ticketId: '500000000000000005',
	}],
	archivedMessages: [{
		authorId: USER,
		content: 'hello',
		createdAt: '2024-01-01T00:00:00.000Z',
		id: '600000000000000006',
		ticketId: OTHER_GUILD_TICKET,
	}],
	archivedRoles: [],
	archivedUsers: [{
		displayName: 'D',
		ticketId: '500000000000000005',
		userId: USER,
		username: 'u',
	}],
	categoryId: 7,
	claimedBy: { update: { messageCount: 99999 } },
	createdById: USER,
	feedback: {
		comment: 'great',
		rating: 5,
		ticketId: '500000000000000005',
		userId: USER,
	},
	guild: { connect: { id: '999999999999999999' } },
	guildId: '999999999999999999',
	id: '500000000000000005',
	number: 1,
	openingMessageId: '700000000000000007',
	questionAnswers: [{
		id: 3,
		questionId: 'q1',
		ticketId: '500000000000000005',
		userId: USER,
		value: 'because',
	}],
	referencesTicketId: OTHER_GUILD_TICKET,
	topic: 'help',
});

test('importTicket only keeps known fields and forces the target guild', () => {
	const [ticket, messages] = importTicket(exported(), GUILD, new Map([[7, 70]]), encrypt);
	assert.deepEqual(ticket.guild, { connect: { id: GUILD } });
	assert.equal(ticket.guildId, undefined);
	assert.equal(ticket.claimedBy, undefined); // nested update on a global user row is dropped
	assert.deepEqual(ticket.category, { connect: { id: 70 } });
	assert.equal(ticket.topic, 'enc(help)');
	assert.deepEqual(messages, [{
		authorId: USER,
		content: 'enc(hello)',
		createdAt: '2024-01-01T00:00:00.000Z',
		id: '600000000000000006',
		ticketId: '500000000000000005', // forced to the imported ticket
	}]);
});

test('importTicket strips ticketId/id from nested creates (upstream #651)', () => {
	const [ticket] = importTicket(exported(), GUILD, new Map([[7, 70]]), encrypt);
	assert.deepEqual(ticket.questionAnswers.create, [{
		questionId: 'q1',
		userId: USER,
		value: 'enc(because)',
	}]);
	assert.equal(ticket.archivedChannels.create[0].ticketId, undefined);
	assert.equal(ticket.archivedUsers.create[0].ticketId, undefined);
	assert.equal(ticket.feedback.create.ticketId, undefined);
	assert.deepEqual(ticket.feedback.create.guild, { connect: { id: GUILD } });
});

test('importTicket rejects malformed IDs and unknown categories', () => {
	assert.throws(() => importTicket({
		...exported(),
		id: { not: 'an id' },
	}, GUILD, new Map([[7, 70]]), encrypt));
	assert.throws(() => importTicket({
		...exported(),
		createdById: 'x',
	}, GUILD, new Map([[7, 70]]), encrypt));
	assert.throws(() => importTicket(exported(), GUILD, new Map(), encrypt));
});
