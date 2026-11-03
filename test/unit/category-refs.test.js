const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ChannelType } = require('discord.js');
const { checkCategoryRefs } = require('../../src/lib/category-refs');
const { ValidationError } = require('../../src/lib/validation');

const guild = {
	id: 'g1',
	roles: { cache: new Set(['r1', 'r2']) },
};
const channels = {
	c1: {
		guildId: 'g1',
		type: ChannelType.GuildCategory,
	},
	other: {
		guildId: 'g2',
		type: ChannelType.GuildCategory,
	},
	text: {
		guildId: 'g1',
		type: ChannelType.GuildText,
	},
};
const getChannel = id => channels[id];

test('roles from other servers are dropped from role rules', () => {
	const data = checkCategoryRefs(guild, {
		pingRoleRules: [
			{
				ping: ['r1', 'x'],
				roles: ['r2', 'x'],
			},
			{
				ping: ['r1'],
				roles: ['x'],
			},
		],
		pingRoles: ['r1', 'x'],
		roleLimits: [
			{
				limit: 2,
				role: 'r1',
			},
			{
				limit: 9,
				role: 'x',
			},
		],
	}, getChannel);
	assert.deepEqual(data.pingRoles, ['r1']);
	assert.deepEqual(data.pingRoleRules, [{
		ping: ['r1'],
		roles: ['r2'],
	}]);
	assert.deepEqual(data.roleLimits, [{
		limit: 2,
		role: 'r1',
	}]);
});

test('fallback categories must be category channels in the same server', () => {
	assert.doesNotThrow(() => checkCategoryRefs(guild, { fallbackCategories: ['c1', 'deleted'] }, getChannel));
	assert.throws(() => checkCategoryRefs(guild, { fallbackCategories: ['other'] }, getChannel), ValidationError);
	assert.throws(() => checkCategoryRefs(guild, { fallbackCategories: ['text'] }, getChannel), ValidationError);
	assert.throws(() => checkCategoryRefs(guild, { discordCategory: 'other' }, getChannel), ValidationError);
});
