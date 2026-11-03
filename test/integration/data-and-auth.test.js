const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	seedCategory, useTestClient,
} = require('../helpers/client');
const { createTestAPI } = require('../helpers/api');
const {
	makeGuild, makeInteraction, makeMember, makeMessage, makeUser,
} = require('../helpers/discord');

const ctx = useTestClient();
let api;
const getAPI = async () => (api ??= await createTestAPI(ctx.client));

/** A multipart/form-data body with one file */
function multipart(name, filename, buffer) {
	const boundary = '----tickets' + Date.now();
	const body = Buffer.concat([
		Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: application/zip\r\n\r\n`),
		buffer,
		Buffer.from(`\r\n--${boundary}--\r\n`),
	]);
	return {
		body,
		headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
	};
}

test('export a server and import it into another (existing data migrates cleanly)', async () => {
	const { client } = ctx;
	const { app } = await getAPI();
	const owner = makeUser();
	const source = makeGuild(client, { ownerId: owner.id });
	const admin = makeMember(source, { admin: true });
	makeMember(source, { user: owner });
	const { category } = await seedCategory(client, source, {
		autoClose: 3600e3,
		questions: {
			create: [{
				id: 'order',
				label: 'Order number',
				order: 0,
			}],
		},
		settings: {
			holidays: ['2026-12-25'],
			webhookSecret: 'encrypted-secret',
			webhookUrl: 'https://example.com/hook',
			workingHours: ['Europe/London', null, ['09:00', '17:00'], ['09:00', '17:00'], ['09:00', '17:00'], ['09:00', '17:00'], ['09:00', '17:00'], null],
		},
	});
	await client.prisma.tag.create({
		data: {
			content: 'Read the FAQ',
			guild: { connect: { id: source.id } },
			name: 'faq',
		},
	});
	// a ticket with an archived message (created without questions so no modal is needed)
	const plain = await seedCategory(client, source, { name: 'General' });
	const creator = makeMember(source);
	await client.tickets.create({
		categoryId: plain.category.id,
		interaction: makeInteraction({ member: creator }),
		topic: 'Help please',
	});
	const [channel] = source.created;
	const hello = makeMessage(channel, {
		author: creator.user,
		content: 'hello',
	});
	await client.tickets.archiver.saveMessage(channel.id, hello);

	const sign = id => app.jwt.sign({
		createdAt: Date.now(),
		expiresAt: Date.now() + 60e3,
		id,
		scopes: ['applications.commands.permissions.update'],
	});
	// exports include who wrote anonymous staff messages, so admins who aren't the owner can't export or import
	const denied = await app.inject({
		headers: { authorization: `Bearer ${sign(admin.id)}` },
		url: `/api/admin/guilds/${source.id}/export`,
	});
	assert.equal(denied.statusCode, 403, 'Manage Server isn\'t enough');
	assert.equal(denied.json().message, 'Only the server\'s owner can do this.');
	const overview = await app.inject({
		headers: { authorization: `Bearer ${sign(admin.id)}` },
		url: `/api/admin/guilds/${source.id}`,
	});
	assert.equal(overview.json().ownerId, owner.id, 'the dashboard can tell who the owner is');
	const token = sign(owner.id);
	const exported = await app.inject({
		headers: { authorization: `Bearer ${token}` },
		url: `/api/admin/guilds/${source.id}/export`,
	});
	assert.equal(exported.statusCode, 200, exported.body);
	const zip = exported.rawPayload;
	assert.ok(zip.length > 100);

	// import into a different server: first a copy while the source still exists (its tickets are skipped,
	// as ticket IDs are channel IDs), then a move, where the source's data is gone
	const target = makeGuild(client, { ownerId: owner.id });
	const targetAdmin = makeMember(target, { user: owner });
	const notOwner = await app.inject({
		headers: { authorization: `Bearer ${sign(admin.id)}` },
		method: 'POST',
		url: `/api/admin/guilds/${target.id}/import`,
	});
	assert.equal(notOwner.statusCode, 403);
	const importInto = async guildId => {
		const upload = multipart('file', 'export.zip', zip);
		const imported = await app.inject({
			headers: {
				...upload.headers,
				authorization: `Bearer ${token}`,
			},
			method: 'POST',
			payload: upload.body,
			url: `/api/admin/guilds/${guildId}/import`,
		});
		assert.equal(imported.statusCode, 200);
		assert.match(imported.body, /All data has been imported/, imported.body);
		return imported.body;
	};
	assert.ok(targetAdmin);

	const copied = await importInto(target.id);
	assert.match(copied, /Skipped 1 tickets/);
	assert.equal((await client.prisma.ticket.count({ where: { guildId: source.id } })), 1, 'the source is untouched');
	assert.equal((await client.prisma.ticket.count({ where: { guildId: target.id } })), 0);

	await client.prisma.guild.delete({ where: { id: source.id } });
	await importInto(target.id);

	const settings = await client.prisma.guild.findUnique({
		include: {
			categories: { include: { questions: true } },
			tags: true,
			tickets: { include: { archivedMessages: true } },
		},
		where: { id: target.id },
	});
	assert.deepEqual(settings.holidays, ['2026-12-25']);
	assert.equal(settings.webhookUrl, 'https://example.com/hook');
	assert.equal(settings.webhookSecret, null, 'the secret isn\'t exported');
	assert.equal(settings.workingHours[1], null, 'days off survive the round trip');
	assert.deepEqual(settings.categories.map(c => c.name).sort(), ['General', 'Support']);
	const support = settings.categories.find(c => c.name === 'Support');
	assert.equal(support.autoClose, 3600e3, 'durations survive the round trip');
	assert.equal(support.questions[0].label, 'Order number');
	assert.notEqual(support.questions[0].id, 'order', 'questions get new IDs so copies on one instance don\'t clash');
	assert.notEqual(support.id, category.id);
	assert.equal(settings.tags[0].name, 'faq');
	assert.equal(settings.tickets.length, 1);
	const importedHello = settings.tickets[0].archivedMessages.find(m => m.id === hello.id);
	assert.ok(importedHello?.content, 'archived messages and their content are imported');
});

test('login only redirects to safe places and sets a scoped state cookie', async () => {
	const { app } = await getAPI();
	process.env.HTTP_EXTERNAL ??= 'https://tickets.example.com';
	for (const [r, expected] of [['/settings', '/settings'], ['https://evil.example', ''], ['//evil.example', ''], ['/\\evil.example', '']]) {
		const res = await app.inject({ url: `/auth/login?r=${encodeURIComponent(r)}` });
		assert.equal(res.statusCode, 302);
		assert.match(res.headers.location, /^https:\/\/discord\.com\/oauth2\/authorize/);
		const cookie = res.cookies.find(c => c.name === 'oauth2-state');
		assert.equal(cookie.path, '/auth');
		assert.equal(cookie.httpOnly, true);
		assert.equal(new URLSearchParams(cookie.value).get('redirect'), expected, r);
	}
	const admin = await app.inject({ url: '/auth/login?role=admin' });
	assert.match(new URL(admin.headers.location).searchParams.get('scope'), /applications\.commands\.permissions\.update/);
});

test('the callback refuses a state that doesn\'t match the cookie', async () => {
	const { app } = await getAPI();
	const res = await app.inject({
		cookies: { 'oauth2-state': 'redirect=&secret=abc' },
		url: '/auth/callback?code=x&state=wrong',
	});
	assert.ok(res.statusCode >= 400 && res.statusCode < 500, String(res.statusCode));
});
