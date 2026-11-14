// Ticket Tool parity, P3: wildcard triggers, automation timing, statistics and the change history
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	checkTagPattern, compileTagPattern, matchWildcard,
} = require('../../src/lib/security');
const { getDueRules } = require('../../src/lib/automations');
const { buildStatistics } = require('../../src/lib/statistics');
const { getHistoryChanges } = require('../../src/lib/logging');
const { canUseButton } = require('../../src/lib/buttons');
const { PermissionsBitField } = require('discord.js');

test('wildcards match the whole message, ignoring case and surrounding spaces', () => {
	assert.ok(matchWildcard('how do i reset my *', '  How do I reset my password '));
	assert.ok(!matchWildcard('how do i reset my *', 'so how do i reset my password'));
	assert.ok(matchWildcard('*refund*', 'Can I get a REFUND please?'));
	assert.ok(matchWildcard('a*b*c', 'axxbyyc'));
	assert.ok(!matchWildcard('a*b', 'ac'));
	assert.ok(matchWildcard('what? (really)', 'what? (really)'), 'everything but * is literal');
	assert.ok(!matchWildcard('what?', 'whatx'));
});

test('wildcards can\'t be used for ReDoS', () => {
	const start = Date.now();
	assert.equal(compileTagPattern({
		matchType: 'WILDCARD',
		regex: '*a*a*a*a*a',
	}).test('a'.repeat(4000) + 'b'), false);
	assert.ok(Date.now() - start < 500, 'linear time');
	assert.equal(checkTagPattern('*a*b*c*d*e*f', 'WILDCARD').ok, false, 'at most 5 wildcards');
	assert.equal(checkTagPattern('(a+)+$', 'WILDCARD').ok, true, 'regex syntax is literal text');
	assert.equal(checkTagPattern('(a+)+$', 'REGEX').ok, false);
	assert.equal(compileTagPattern({ regex: 'pass(word)?' }).test('my password'), true, 'REGEX by default');
});

test('automations: rules are due once, in order, for whoever the ticket is waiting on', () => {
	const hour = 3_600_000;
	const rules = [
		{
			action: 'CLOSE',
			after: 3 * hour,
			waitingOn: 'STAFF',
		},
		{
			action: 'TAG',
			after: hour,
			tag: 'a',
			waitingOn: 'STAFF',
		},
		{
			action: 'TAG',
			after: hour,
			tag: 'b',
			waitingOn: 'CREATOR',
		},
	];
	const ticket = {
		automatedAt: null,
		createdAt: new Date(0),
		lastMessageAt: new Date(0),
		waitingOn: 'STAFF',
	};
	assert.deepEqual(getDueRules(rules, ticket, hour - 1), []);
	assert.deepEqual(getDueRules(rules, ticket, 4 * hour).map(r => r.tag ?? r.action), ['a', 'CLOSE']);
	assert.deepEqual(getDueRules(rules, {
		...ticket,
		automatedAt: new Date(2 * hour),
	}, 4 * hour).map(r => r.action), ['CLOSE']);
	assert.deepEqual(getDueRules(rules, {
		...ticket,
		waitingOn: null,
	}, 4 * hour), []);
	assert.deepEqual(getDueRules(rules, {
		...ticket,
		waitingOn: 'CREATOR',
	}, 4 * hour).map(r => r.tag), ['b']);
});

test('statistics: per day, per category and per staff member, without anonymous categories in staff counts', () => {
	const day = 86_400_000;
	const now = Date.UTC(2026, 10, 14, 12);
	const categories = new Map([[1, {
		anonymous: false,
		name: 'Support',
	}], [2, {
		anonymous: true,
		name: 'Reports',
	}]]);
	const stats = buildStatistics([
		{
			categoryId: 1,
			claimedById: 's',
			closedAt: new Date(now - day),
			closedById: 's',
			createdAt: new Date(now - (2 * day)),
			createdById: 'c',
			feedback: { rating: 4 },
			firstResponseAt: new Date(now - (2 * day) + 60_000),
		},
		{
			categoryId: 1,
			closedAt: new Date(now),
			closedById: 'c',
			createdAt: new Date(now - day),
			createdById: 'c',
		},
		{
			categoryId: 2,
			claimedById: 's',
			closedAt: new Date(now),
			closedById: 's',
			createdAt: new Date(now - day),
			createdById: 'c',
		},
		{
			categoryId: 1,
			createdAt: new Date(now - (30 * day)),
			createdById: 'c',
		},
	], {
		categories,
		days: 7,
		now,
	});
	assert.equal(stats.days.length, 7);
	assert.equal(stats.days.at(-1).date, '2026-11-14');
	assert.deepEqual(stats.totals, {
		avgRating: 4,
		avgResolutionTime: '1d',
		avgResponseTime: '1m',
		closed: 3,
		created: 3,
	});
	assert.deepEqual(stats.staff, [{
		claimed: 1,
		closed: 1,
		id: 's',
	}], 'closing your own ticket and anonymous tickets don\'t count');
	assert.equal(stats.categories.find(c => c.id === 2).closed, 1);
});

test('change history: only changed fields, never secrets, and long values are cut short', () => {
	const changes = getHistoryChanges({
		original: {
			id: 1,
			name: 'a',
			same: 1,
			webhookSecret: 'x',
			webhookUrl: null,
		},
		updated: {
			id: 1,
			name: 'b',
			openingMessage: 'x'.repeat(600),
			same: 1,
			webhookSecret: 'y',
			webhookUrl: 'https://example.com',
		},
	});
	assert.deepEqual(changes.map(c => c.field), ['name', 'openingMessage', 'webhookUrl']);
	assert.equal(changes[1].to.length, 501);
	assert.equal(getHistoryChanges(undefined).length, 0);
});

test('button roles: allow and deny lists, and Manage Server always allowed', () => {
	const member = (roles, permissions = 0n) => ({
		guild: { ownerId: 'owner' },
		id: 'm',
		permissions: new PermissionsBitField(permissions),
		roles: { cache: new Map(roles.map(id => [id, {}])) },
	});
	const custom = {
		close: {
			allow: ['staff'],
			deny: ['trainee'],
		},
	};
	assert.ok(canUseButton(member(['staff']), custom, 'close'));
	assert.ok(!canUseButton(member(['staff', 'trainee']), custom, 'close'));
	assert.ok(!canUseButton(member([]), custom, 'close'));
	assert.ok(canUseButton(member(['trainee'], PermissionsBitField.Flags.ManageGuild), custom, 'close'));
	assert.ok(canUseButton(member([]), custom, 'claim'), 'other buttons aren\'t limited');
	assert.ok(canUseButton(member([]), null, 'close'));
});
