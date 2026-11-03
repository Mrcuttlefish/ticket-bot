const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	seedCategory, useTestClient,
} = require('../helpers/client');
const { createTestAPI } = require('../helpers/api');
const {
	makeCategoryChannel, makeGuild, makeMember, makeRole, makeTextChannel,
} = require('../helpers/discord');

const ctx = useTestClient();
let api;

async function server() {
	const { client } = ctx;
	api ??= await createTestAPI(client);
	const guild = makeGuild(client);
	const admin = makeMember(guild, { admin: true });
	const member = makeMember(guild);
	const { category } = await seedCategory(client, guild);
	return {
		admin: api.as(admin.id),
		category,
		client,
		guild,
		member: api.as(member.id),
		url: `/api/admin/guilds/${guild.id}`,
	};
}

test('admin routes need a login, admin permissions, and the admin scope', async () => {
	const {
		admin, guild, member, url,
	} = await server();
	const anonymous = await api.app.inject({ url: `${url}/settings` });
	assert.equal(anonymous.statusCode, 401);
	assert.equal((await member('GET', `${url}/settings`)).status, 403);
	assert.equal((await admin('GET', `${url}/settings`)).status, 200);

	const owner = makeMember(guild, { admin: true });
	const noScope = api.as(owner.id, { scopes: ['identify'] });
	assert.equal((await noScope('GET', `${url}/settings`)).status, 401);

	const outsider = api.as('123456789012345678');
	assert.equal((await outsider('GET', `${url}/settings`)).status, 403);
	assert.equal((await admin('GET', '/api/admin/guilds/123456789012345678/settings')).status, 404);
});

test('expired tokens are rejected', async () => {
	const { url } = await server();
	const expired = api.as('1', { expiresAt: Date.now() - 1 });
	const res = await expired('GET', `${url}/settings`);
	assert.equal(res.status, 401);
	assert.match(res.body.message, /expired/);
});

test('PATCH settings only writes allowlisted fields', async () => {
	const {
		admin, client, guild, url,
	} = await server();
	const res = await admin('PATCH', `${url}/settings`, {
		archive: false,
		categories: { connect: { id: 5 } },
		id: '999999999999999999',
		tickets: { connect: [{ id: '1' }] },
	});
	assert.equal(res.status, 200);
	const settings = await client.prisma.guild.findUnique({ where: { id: guild.id } });
	assert.equal(settings.archive, false);
	assert.equal(await client.prisma.guild.findUnique({ where: { id: '999999999999999999' } }), null);
});

test('PATCH settings validates values and rejects channels from other servers', async () => {
	const {
		admin, client, url,
	} = await server();
	const elsewhere = makeTextChannel(makeGuild(client));
	for (const body of [
		{ logChannel: elsewhere.id },
		{ autoClose: 'soon' },
		{ primaryColour: 'not a colour' },
		{ holidays: ['tomorrow'] },
		{ webhookUrl: 'https://169.254.169.254/latest/meta-data' },
	]) {
		const res = await admin('PATCH', `${url}/settings`, body);
		assert.equal(res.status, 400, JSON.stringify(body));
	}
});

test('PATCH settings: null auto-close turns it off instead of erroring', async () => {
	const {
		admin, url,
	} = await server();
	const res = await admin('PATCH', `${url}/settings`, { autoClose: null });
	assert.equal(res.status, 200);
	assert.equal(res.body.autoClose, 0);
});

test('the webhook secret is write-only', async () => {
	const {
		admin, client, guild, url,
	} = await server();
	const res = await admin('PATCH', `${url}/settings`, {
		webhookSecret: 'shh',
		webhookUrl: 'https://example.com/hook',
	});
	assert.equal(res.status, 200);
	assert.equal(res.body.webhookSecret, '********');
	assert.equal((await admin('GET', `${url}/settings`)).body.webhookSecret, '********');
	const stored = await client.prisma.guild.findUnique({ where: { id: guild.id } });
	assert.notEqual(stored.webhookSecret, 'shh', 'stored encrypted');

	// sending the mask back doesn't change it
	await admin('PATCH', `${url}/settings`, { webhookSecret: '********' });
	assert.equal((await client.prisma.guild.findUnique({ where: { id: guild.id } })).webhookSecret, stored.webhookSecret);
});

test('categories: roles and Discord categories from other servers are refused', async () => {
	const {
		admin, category, client, guild, url,
	} = await server();
	const role = makeRole(guild);
	guild.roles.cache.set(role.id, role);
	const otherGuild = makeGuild(client);
	const foreignRole = makeRole(otherGuild);
	const foreignCategory = makeCategoryChannel(otherGuild);

	let res = await admin('PATCH', `${url}/categories/${category.id}`, {
		blockedRoles: [role.id, foreignRole.id],
		roleLimits: [{
			limit: 3,
			role: foreignRole.id,
		}],
		staffRoles: [role.id, foreignRole.id],
	});
	assert.equal(res.status, 200);
	const saved = await client.prisma.category.findUnique({ where: { id: category.id } });
	assert.deepEqual(saved.staffRoles, [role.id]);
	assert.deepEqual(saved.blockedRoles, [role.id]);
	assert.deepEqual(saved.roleLimits, []);

	res = await admin('PATCH', `${url}/categories/${category.id}`, { fallbackCategories: [foreignCategory.id] });
	assert.equal(res.status, 400);
	res = await admin('PATCH', `${url}/categories/${category.id}`, { guildId: otherGuild.id });
	assert.equal(res.status, 200);
	assert.equal((await client.prisma.category.findUnique({ where: { id: category.id } })).guildId, guild.id, 'guildId is ignored');
});

test('categories from another server can\'t be read or changed', async () => {
	const {
		admin, client,
	} = await server();
	const other = makeGuild(client);
	const { category: theirs } = await seedCategory(client, other);
	const { url } = await server();
	assert.equal((await admin('GET', `${url}/categories/${theirs.id}`)).status, 403); // not an admin there
	const res = await admin('GET', `/api/admin/guilds/${other.id}/categories/${theirs.id}`);
	assert.equal(res.status, 403);
});

test('category overrides are saved and durations stay in milliseconds (upstream #536)', async () => {
	const {
		admin, category, client, url,
	} = await server();
	const res = await admin('PATCH', `${url}/categories/${category.id}`, {
		archive: false,
		autoClose: 7 * 24 * 3600e3,
		staleAfter: null,
	});
	assert.equal(res.status, 200);
	assert.equal(res.body.autoClose, 7 * 24 * 3600e3);
	const raw = await client.prisma.category.findUnique({ where: { id: category.id } });
	assert.equal(raw.archive, false);
	assert.equal(raw.autoClose, 7 * 24 * 3600e3);
	assert.equal(raw.staleAfter, null);
});

test('questions: unsaved ones can be deleted, other categories\' can\'t (upstream #465)', async () => {
	const {
		admin, category, client, guild, url,
	} = await server();
	assert.deepEqual((await admin('DELETE', `${url}/categories/${category.id}/questions/not-saved-yet`)).body, { id: 'not-saved-yet' });

	const { category: other } = await seedCategory(client, guild, {
		questions: {
			create: [{
				id: 'their-question',
				label: 'Q',
				order: 0,
			}],
		},
	});
	assert.equal((await admin('DELETE', `${url}/categories/${category.id}/questions/their-question`)).status, 400);
	assert.ok(await client.prisma.question.findUnique({ where: { id: 'their-question' } }));
	assert.equal((await admin('DELETE', `${url}/categories/${other.id}/questions/their-question`)).status, 200);
});

test('tags: unsafe regular expressions are refused', async () => {
	const {
		admin, url,
	} = await server();
	const ok = await admin('POST', `${url}/tags`, {
		content: 'Hi {user}',
		name: 'hello',
		regex: 'h(e|a)llo',
	});
	assert.equal(ok.status, 200);
	const evil = await admin('POST', `${url}/tags`, {
		content: 'x',
		name: 'evil',
		regex: '(a+)+$',
	});
	assert.equal(evil.status, 400);
});

test('panels: single-category buttons use the category (upstream #450, #616) and channels must be in the server', async () => {
	const {
		admin, category, client, guild, url,
	} = await server();
	await client.prisma.category.update({
		data: {
			emoji: 'bug',
			name: 'Bug reports',
		},
		where: { id: category.id },
	});
	const channel = makeTextChannel(guild);
	let res = await admin('POST', `${url}/panels`, {
		categories: [category.id],
		channel: channel.id,
		type: 'BUTTON',
	});
	assert.equal(res.status, 200, res.text);
	const button = channel.sent[0].components[0].components[0].data;
	assert.equal(button.label, 'Bug reports');
	assert.equal(button.emoji.name, '🐛');

	const elsewhere = makeTextChannel(makeGuild(client));
	res = await admin('POST', `${url}/panels`, {
		categories: [category.id],
		channel: elsewhere.id,
		type: 'BUTTON',
	});
	assert.equal(res.status, 400);
	assert.equal(elsewhere.sent.length, 0);
});

test('panels: editing needs a panel sent by the bot (upstream #362)', async () => {
	const {
		admin, category, guild, url,
	} = await server();
	const channel = makeTextChannel(guild);
	const res = await admin('POST', `${url}/panels`, {
		categories: [category.id],
		channel: channel.id,
		message: '123456789012345678',
		type: 'BUTTON',
	});
	assert.equal(res.status, 400);
	assert.match(res.body.message, /panel sent by the bot/);
	assert.equal(channel.sent.length, 0);
});

test('/status and /metrics', async () => {
	await server();
	const status = await api.app.inject({ url: '/status' });
	assert.equal(status.statusCode, 200);
	assert.equal((await api.app.inject({ url: '/metrics' })).statusCode, 404, 'off without METRICS_TOKEN');
});
