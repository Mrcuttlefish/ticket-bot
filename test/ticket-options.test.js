const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	getMemberLimit, getNumberBase, getPingRoles, pickDiscordCategory,
} = require('../src/lib/tickets/options');
const { shouldGhostPing } = require('../src/lib/tickets/ghost-ping');

const has = (...roles) => id => roles.includes(id);

test('member limit: role limits override the category limit, highest wins (upstream #385)', () => {
	const category = {
		memberLimit: 1,
		roleLimits: [
			{
				limit: 3,
				role: 'donator',
			},
			{
				limit: 5,
				role: 'staff',
			},
			{
				limit: 0,
				role: 'muted',
			},
		],
	};
	assert.equal(getMemberLimit(category, has()), 1);
	assert.equal(getMemberLimit(category, has('donator')), 3);
	assert.equal(getMemberLimit(category, has('donator', 'staff')), 5);
	assert.equal(getMemberLimit(category, has('muted')), 0);
	assert.equal(getMemberLimit({ memberLimit: 2 }, has('donator')), 2); // existing rows without the column
});

test('ping roles: rules for the creator\'s roles replace the default pings (upstream #386)', () => {
	const category = {
		pingRoleRules: [
			{
				ping: ['spanish-staff'],
				roles: ['spanish'],
			},
			{
				ping: ['french-staff', 'spanish-staff'],
				roles: ['french'],
			},
			{
				ping: ['nobody'],
				roles: [],
			},
		],
		pingRoles: ['staff'],
	};
	assert.deepEqual(getPingRoles(category, has()), ['staff']);
	assert.deepEqual(getPingRoles(category, has('spanish')), ['spanish-staff']);
	assert.deepEqual(getPingRoles(category, has('spanish', 'french')), ['spanish-staff', 'french-staff']);
	assert.deepEqual(getPingRoles({ pingRoles: ['staff'] }, has('spanish')), ['staff']);
});

test('discord category: falls back when full or missing (upstream #472)', () => {
	const sizes = {
		a: 50,
		b: 49,
		c: 10,
	};
	const count = id => sizes[id] ?? null;
	assert.equal(pickDiscordCategory({ discordCategory: 'c' }, count), 'c');
	assert.equal(pickDiscordCategory({ discordCategory: 'a' }, count), null);
	assert.equal(pickDiscordCategory({
		discordCategory: 'a',
		fallbackCategories: ['deleted', 'b', 'c'],
	}, count), 'b');
	assert.equal(pickDiscordCategory({
		discordCategory: 'deleted',
		fallbackCategories: ['c'],
	}, count), 'c');
});

test('number offset never makes numbers go backwards (upstream #416)', () => {
	assert.equal(getNumberBase(null), 0);
	assert.equal(getNumberBase(null, 1000), 1000);
	assert.equal(getNumberBase(1500, 1000), 1500);
	assert.equal(getNumberBase(10, 0), 10);
});

test('ghost ping: only staff replies to an inactive creator, once (upstream #346)', () => {
	const base = {
		alreadyPinged: false,
		creatorActive: false,
		enabled: true,
		isCreator: false,
		mentionsCreator: false,
		staff: true,
	};
	assert.equal(shouldGhostPing(base), true);
	assert.equal(shouldGhostPing({
		...base,
		enabled: false,
	}), false);
	assert.equal(shouldGhostPing({
		...base,
		staff: false,
	}), false);
	assert.equal(shouldGhostPing({
		...base,
		creatorActive: true,
	}), false);
	assert.equal(shouldGhostPing({
		...base,
		alreadyPinged: true,
	}), false);
	assert.equal(shouldGhostPing({
		...base,
		mentionsCreator: true,
	}), false);
	assert.equal(shouldGhostPing({
		...base,
		isCreator: true,
	}), false);
});
