const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	seedCategory, useTestClient,
} = require('../helpers/client');
const {
	makeGuild, makeInteraction, makeMember, makeMessage, makeRole, makeUser,
} = require('../helpers/discord');
const { createTestAPI } = require('../helpers/api');
const MessageCreate = require('../../src/listeners/client/messageCreate');
const { runComponent } = require('../helpers/discord');

const ctx = useTestClient();

// messages are archived in the background
async function archived(client, id) {
	for (let i = 0; i < 100; i++) {
		if (await client.prisma.archivedMessage.findUnique({ where: { id } })) return;
		await new Promise(resolve => setTimeout(resolve, 50));
	}
	throw new Error(`Message ${id} was not archived`);
}
let api;

process.env.HTTP_EXTERNAL ??= 'https://tickets.example.com';

async function setup(seed = {}) {
	const { client } = ctx;
	api ??= await createTestAPI(client);
	const guild = makeGuild(client);
	const staffRole = makeRole(guild);
	const { category } = await seedCategory(client, guild, {
		memberLimit: 10,
		staffRoles: [staffRole.id],
		...seed,
	});
	const creator = makeMember(guild, { user: makeUser({ username: 'casey' }) });
	const other = makeMember(guild, { user: makeUser({ username: 'robin' }) });
	const staff = makeMember(guild, {
		roles: [staffRole.id],
		user: makeUser({ username: 'alex' }),
	});
	const open = async (member, topic) => {
		await client.keyv.clear(); // the creation rate limit
		await client.tickets.create({
			categoryId: category.id,
			interaction: makeInteraction({ member }),
			topic,
		});
		return guild.created[guild.created.length - 1];
	};
	const say = async (channel, member, content) => {
		const message = makeMessage(channel, {
			author: member.user,
			content,
		});
		await runComponent(MessageCreate, client, message);
		await archived(client, message.id);
		return message;
	};
	return {
		category,
		client,
		creator,
		guild,
		open,
		other,
		say,
		staff,
		url: `/api/guilds/${guild.id}/tickets`,
	};
}

test('portal: staff see every ticket, members only their own', async () => {
	const {
		creator, open, other, staff, url,
	} = await setup();
	await open(creator, 'My order is missing');
	await open(other, 'Refund please');
	await open(creator, 'Another question');

	let res = await api.as(staff.id)('GET', url);
	assert.equal(res.status, 200, res.text);
	assert.equal(res.body.tickets.length, 3);
	assert.equal(res.body.tickets[0].topic, 'Another question', 'newest first, topics decrypted');
	assert.equal(res.body.users[creator.id].username, 'casey');
	assert.ok(res.body.tickets[0].category.name);

	res = await api.as(creator.id)('GET', url);
	assert.deepEqual(res.body.tickets.map(t => t.topic).sort(), ['Another question', 'My order is missing']);

	res = await api.as(creator.id)('GET', `${url}?creator=${other.id}`);
	assert.equal(res.body.tickets.length, 2, 'members can\'t list other people\'s tickets');

	res = await api.as(staff.id)('GET', `${url}?q=refund`);
	assert.deepEqual(res.body.tickets.map(t => t.topic), ['Refund please'], 'topic search');
	res = await api.as(staff.id)('GET', `${url}?q=%232`);
	assert.deepEqual(res.body.tickets.map(t => t.number), [2], 'number search');

	res = await api.as(staff.id)('GET', `${url}?limit=2`);
	assert.equal(res.body.tickets.length, 2);
	assert.ok(res.body.next);
	res = await api.as(staff.id)('GET', `${url}?limit=2&cursor=${res.body.next}`);
	assert.deepEqual(res.body.tickets.map(t => t.number), [1]);
	assert.equal(res.body.next, null);
});

test('portal: a ticket, its permissions, and 404 for tickets you can\'t see', async () => {
	const {
		creator, open, other, staff, url,
	} = await setup();
	const channel = await open(creator, 'My order is missing');

	let res = await api.as(creator.id)('GET', `${url}/${channel.id}`);
	assert.equal(res.status, 200, res.text);
	assert.equal(res.body.topic, 'My order is missing');
	assert.deepEqual(res.body.permissions, {
		canClose: true,
		canReply: true,
		isStaff: false,
	});
	res = await api.as(staff.id)('GET', `${url}/${channel.id}`);
	assert.equal(res.body.permissions.isStaff, true);
	res = await api.as(other.id)('GET', `${url}/${channel.id}`);
	assert.equal(res.status, 404);
	res = await api.as(other.id)('GET', `${url}/${channel.id}/messages`);
	assert.equal(res.status, 404);
});

test('portal: messages are oldest first, and anonymous tickets hide staff from the creator', async () => {
	const {
		creator, open, say, staff, url,
	} = await setup({ anonymous: true });
	const channel = await open(creator, 'Help');
	await say(channel, creator, 'first');
	await say(channel, staff, 'second');

	let res = await api.as(creator.id)('GET', `${url}/${channel.id}/messages`);
	assert.equal(res.status, 200, res.text);
	const texts = res.body.messages.filter(m => !m.author.bot);
	assert.deepEqual(texts.map(m => m.content), ['first', 'second']);
	assert.equal(texts[0].author.username, 'casey');
	assert.equal(texts[1].author.username, 'Staff', 'the creator sees "Staff"');
	assert.ok(!res.text.includes(staff.id));

	res = await api.as(staff.id)('GET', `${url}/${channel.id}/messages`);
	assert.equal(res.body.messages.filter(m => !m.author.bot)[1].author.username, 'alex', 'staff see who replied');
});

test('portal: replying from the web', async () => {
	const {
		client, creator, open, other, staff, url,
	} = await setup();
	const channel = await open(creator, 'Help');
	const reply = api.as(staff.id);

	let res = await reply('POST', `${url}/${channel.id}/messages`, { content: 'On it @everyone' });
	assert.equal(res.status, 201, res.text);
	assert.equal(res.body.message.content, 'On it @everyone');
	assert.equal(res.body.message.author.username, 'alex', 'archived with the real author');
	assert.equal(res.body.message.viaWeb, true);
	const sent = channel.sent[channel.sent.length - 1];
	assert.deepEqual(sent.allowedMentions, { parse: [] }, 'web replies can\'t ping anyone');
	assert.match(sent.embeds[0].data.author.name, /alex.*via the web/);
	assert.ok(sent.nonce.startsWith('web'));

	// the bot's own copy isn't archived a second time
	const copy = [...channel.messages.cache.values()].find(m => m.nonce === sent.nonce);
	await runComponent(MessageCreate, client, copy);
	await new Promise(resolve => setTimeout(resolve, 100));
	res = await reply('GET', `${url}/${channel.id}/messages`);
	assert.equal(res.body.messages.filter(m => m.content === 'On it @everyone').length, 1);

	const ticket = await client.prisma.ticket.findUnique({ where: { id: channel.id } });
	assert.ok(ticket.firstResponseAt, 'a staff reply is the first response');

	res = await reply('POST', `${url}/${channel.id}/messages`, { content: '' });
	assert.equal(res.status, 400);
	res = await reply('POST', `${url}/${channel.id}/messages`, { content: 'x'.repeat(2001) });
	assert.equal(res.status, 400);
	res = await api.as(other.id)('POST', `${url}/${channel.id}/messages`, { content: 'hi' });
	assert.equal(res.status, 404, 'only staff and the creator');

	// rate limit: 5 per 10 seconds (one was sent above)
	const statuses = [];
	for (let i = 0; i < 5; i++) statuses.push((await reply('POST', `${url}/${channel.id}/messages`, { content: `n${i}` })).status);
	assert.deepEqual(statuses, [201, 201, 201, 201, 429]);
});

test('portal: cookie requests must come from the portal and send JSON', async () => {
	const {
		creator, open, url,
	} = await setup();
	const channel = await open(creator, 'Help');
	const token = api.app.jwt.sign({
		createdAt: Date.now(),
		expiresAt: Date.now() + 60e3,
		id: creator.id,
	});
	const post = headers => api.app.inject({
		cookies: { token },
		headers,
		method: 'POST',
		payload: JSON.stringify({ content: 'hello' }),
		url: `${url}/${channel.id}/messages`,
	});
	assert.equal((await post({ 'content-type': 'application/json' })).statusCode, 403, 'no Origin');
	assert.equal((await post({
		'content-type': 'application/json',
		'origin': 'https://evil.example',
	})).statusCode, 403);
	assert.equal((await post({
		'content-type': 'text/plain',
		'origin': new URL(process.env.HTTP_EXTERNAL).origin,
	})).statusCode, 415);
	const ok = await post({
		'content-type': 'application/json',
		'origin': new URL(process.env.HTTP_EXTERNAL).origin,
	});
	assert.equal(ok.statusCode, 201, ok.body);
});

test('portal: closing from the web', async () => {
	const {
		client, creator, open, other, url,
	} = await setup();
	const channel = await open(creator, 'Help');
	let res = await api.as(other.id)('POST', `${url}/${channel.id}/close`, {});
	assert.equal(res.status, 404);
	res = await api.as(creator.id)('POST', `${url}/${channel.id}/close`, { reason: 'Sorted' });
	assert.equal(res.status, 200, res.text);
	await new Promise(resolve => setTimeout(resolve, 50));
	const ticket = await client.prisma.ticket.findUnique({ where: { id: channel.id } });
	assert.equal(ticket.open, false);
	assert.equal(ticket.closedById, creator.id);
	res = await api.as(creator.id)('POST', `${url}/${channel.id}/close`, {});
	assert.equal(res.status, 403, 'already closed');
	res = await api.as(creator.id)('POST', `${url}/${channel.id}/messages`, { content: 'hi' });
	assert.equal(res.status, 403, 'closed tickets can\'t be replied to');
});

test('portal: live events stream new messages and the close', async () => {
	const {
		client, creator, open, say, url,
	} = await setup();
	const channel = await open(creator, 'Help');
	const address = await api.app.listen({
		host: '127.0.0.1',
		port: 0,
	});
	const token = api.app.jwt.sign({
		createdAt: Date.now(),
		expiresAt: Date.now() + 60e3,
		id: creator.id,
	});
	const response = await fetch(`${address}${url}/${channel.id}/events`, { headers: { authorization: `Bearer ${token}` } });
	assert.equal(response.headers.get('content-type'), 'text/event-stream; charset=utf-8');
	const reader = response.body.getReader();
	let text = '';
	const readUntil = async pattern => {
		while (!pattern.test(text)) {
			const { value, done } = await reader.read(); // eslint-disable-line object-curly-newline
			if (done) break;
			text += Buffer.from(value).toString();
		}
	};
	await readUntil(/event: ready/);
	await say(channel, creator, 'live message');
	await readUntil(/live message/);
	assert.match(text, /event: message\ndata: .*"content":"live message"/);
	await client.tickets.finallyClose(channel.id, { reason: 'done' });
	await readUntil(/event: ticket-closed/);
	assert.match(text, /event: ticket-closed/);
	await api.app.close();
});
