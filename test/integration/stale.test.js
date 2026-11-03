const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	seedCategory, useTestClient,
} = require('../helpers/client');
const {
	embedText, makeGuild, makeInteraction, makeMember,
} = require('../helpers/discord');
const handleStaleTickets = require('../../src/lib/stale');

const ctx = useTestClient();
const HOUR = 3600e3;
const INTERVAL = 15 * 60e3;

async function ticketIn(guild, category, lastMessageAgo) {
	const { client } = ctx;
	const member = makeMember(guild);
	await client.tickets.create({
		categoryId: category.id,
		interaction: makeInteraction({ member }),
	});
	const channel = guild.created.at(-1);
	await client.prisma.ticket.update({
		data: { lastMessageAt: new Date(Date.now() - lastMessageAgo) },
		where: { id: channel.id },
	});
	return channel;
}

const isOpen = async id => (await ctx.client.prisma.ticket.findUnique({ where: { id } })).open;

test('categories override the guild\'s stale settings (upstream #536)', async () => {
	const { client } = ctx;
	const guild = makeGuild(client);
	// the guild marks tickets stale after a day; one category after an hour, one never
	const { category: inherits } = await seedCategory(client, guild, { settings: { staleAfter: 24 * HOUR } });
	const { category: fast } = await seedCategory(client, guild, { staleAfter: HOUR });
	const { category: never } = await seedCategory(client, guild, { staleAfter: 0 });

	const quiet = 2 * HOUR;
	const a = await ticketIn(guild, inherits, quiet);
	const b = await ticketIn(guild, fast, quiet);
	const c = await ticketIn(guild, never, 48 * HOUR);
	await handleStaleTickets(client, INTERVAL);

	assert.equal(client.tickets.$stale.has(a.id), false, 'not stale yet with the guild setting');
	assert.equal(client.tickets.$stale.has(b.id), true, 'stale with the category setting');
	assert.equal(client.tickets.$stale.has(c.id), false, 'stale handling is off for this category');
	assert.match(embedText(b.sent.at(-1)), /inactive/i);
});

test('stale tickets past auto-close are closed, even after a restart (upstream #552)', async () => {
	const { client } = ctx;
	const guild = makeGuild(client);
	const { category } = await seedCategory(client, guild, {
		settings: {
			autoClose: HOUR,
			staleAfter: HOUR,
		},
	});
	const old = await ticketIn(guild, category, 3 * HOUR); // stale for 2h, so past auto-close
	const recent = await ticketIn(guild, category, 90 * 60e3); // stale for 30m
	client.tickets.$stale.clear(); // a restart loses the in-memory state
	await handleStaleTickets(client, INTERVAL);
	assert.equal(await isOpen(old.id), false);
	assert.equal(await isOpen(recent.id), true);
	assert.ok(client.tickets.$stale.get(recent.id).closeAt > Date.now());
});

test('close requests auto-close even if the guild has no stale setting', async () => {
	const { client } = ctx;
	const guild = makeGuild(client);
	const { category } = await seedCategory(client, guild, { settings: { autoClose: HOUR } });
	const channel = await ticketIn(guild, category, 0);
	client.tickets.$stale.set(channel.id, {
		closeAt: Date.now() - 1,
		closedBy: null,
		message: null,
		messages: 0,
		reason: 'requested',
		staleSince: Date.now() - HOUR,
	});
	await handleStaleTickets(client, INTERVAL);
	assert.equal(await isOpen(channel.id), false);
});

test('close requests without auto-close are never closed by the job', async () => {
	const { client } = ctx;
	const guild = makeGuild(client);
	const { category } = await seedCategory(client, guild, { settings: { autoClose: 0 } }); // off
	const channel = await ticketIn(guild, category, 0);
	client.tickets.$stale.set(channel.id, {
		closeAt: null,
		closedBy: null,
		message: null,
		messages: 0,
		reason: null,
		staleSince: Date.now() - HOUR,
	});
	await handleStaleTickets(client, INTERVAL);
	assert.equal(await isOpen(channel.id), true);
});
