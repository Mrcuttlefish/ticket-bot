const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	seedCategory, useTestClient,
} = require('../helpers/client');
const {
	embedText, makeGuild, makeInteraction, makeMember, makeMessage, makeRole, runComponent,
} = require('../helpers/discord');
const MessageCreate = require('../../src/listeners/client/messageCreate');
const EditButton = require('../../src/buttons/edit');

const ctx = useTestClient();

/** Retry until `fn` returns something truthy (for work the bot does in the background) */
async function eventually(fn, timeout = 5000) {
	const until = Date.now() + timeout;
	for (;;) {
		const result = await fn();
		if (result || Date.now() > until) return result;
		await new Promise(resolve => setTimeout(resolve, 25));
	}
}

async function openTicket(seed = {}) {
	const { client } = ctx;
	const guild = makeGuild(client);
	const staffRole = makeRole(guild);
	const { category } = await seedCategory(client, guild, {
		staffRoles: [staffRole.id],
		...seed,
	});
	const creator = makeMember(guild);
	const staff = makeMember(guild, { roles: [staffRole.id] });
	await client.tickets.create({
		categoryId: category.id,
		interaction: makeInteraction({ member: creator }),
	});
	return {
		category,
		channel: guild.created[0],
		client,
		creator,
		guild,
		staff,
	};
}

const say = async (client, channel, member, content = 'hello') => {
	const message = makeMessage(channel, {
		author: member.user,
		content,
	});
	await runComponent(MessageCreate, client, message);
	// archiving and ghost pings don't block the listener
	await new Promise(resolve => setTimeout(resolve, 50));
	return message;
};

test('messages in tickets are archived, unless the category turns archiving off (upstream #536)', async () => {
	const archived = await openTicket();
	const message = await say(archived.client, archived.channel, archived.creator, 'my order is late');
	// archiving happens in the background
	const row = await eventually(() => archived.client.prisma.archivedMessage.findUnique({ where: { id: message.id } }));
	assert.ok(row, 'archived');
	assert.notEqual(row.content, 'my order is late', 'archived content is encrypted');

	const notArchived = await openTicket({ archive: false });
	const other = await say(notArchived.client, notArchived.channel, notArchived.creator);
	await new Promise(resolve => setTimeout(resolve, 200));
	assert.equal(await notArchived.client.prisma.archivedMessage.findUnique({ where: { id: other.id } }), null);
});

test('messages update the ticket\'s last activity and first response time', async () => {
	const {
		client, channel, creator, staff,
	} = await openTicket();
	await say(client, channel, creator);
	let ticket = await client.prisma.ticket.findUnique({ where: { id: channel.id } });
	assert.ok(ticket.lastMessageAt);
	assert.equal(ticket.firstResponseAt, null, 'the creator isn\'t a response');
	await say(client, channel, staff);
	ticket = await client.prisma.ticket.findUnique({ where: { id: channel.id } });
	assert.ok(ticket.firstResponseAt);
});

test('a message un-stales a ticket and removes the warning', async () => {
	const {
		client, channel, creator,
	} = await openTicket();
	const warning = await channel.send({ content: 'inactive' });
	client.tickets.$stale.set(channel.id, {
		closeAt: Date.now() + 1e6,
		message: warning,
		messages: 0,
	});
	await say(client, channel, creator);
	assert.equal(client.tickets.$stale.has(channel.id), false);
	assert.equal(warning.deleted, true);
});

test('ghost pings the creator once when staff reply (upstream #346)', async () => {
	const {
		client, channel, creator, staff,
	} = await openTicket({ settings: { ghostPing: true } });
	const pings = () => channel.sent.filter(p => p.content === `<@${creator.id}>`);

	await say(client, channel, staff, 'any update?');
	assert.equal(pings().length, 1);
	const ping = [...channel.messages.cache.values()].find(m => m.content === `<@${creator.id}>`);
	assert.equal(ping, undefined, 'the ping is deleted');

	await say(client, channel, staff, 'still there?');
	assert.equal(pings().length, 1, 'only once until the creator replies');

	await say(client, channel, creator, 'yes');
	await say(client, channel, staff, 'great');
	assert.equal(pings().length, 1, 'not while the creator is active');
});

test('no ghost pings unless the guild turns them on', async () => {
	const {
		client, channel, creator, staff,
	} = await openTicket();
	await say(client, channel, staff);
	assert.equal(channel.sent.filter(p => p.content === `<@${creator.id}>`).length, 0);
});

test('only the creator can edit their answers (upstream #508)', async () => {
	const {
		client, channel, creator, guild, staff,
	} = await openTicket();
	await client.prisma.ticket.update({
		data: {
			questionAnswers: {
				create: [{
					question: {
						create: {
							category: { connect: { id: (await client.prisma.ticket.findUnique({ where: { id: channel.id } })).categoryId } },
							label: 'Order number',
							order: 0,
						},
					},
					user: { connect: { id: creator.id } },
					value: null,
				}],
			},
		},
		where: { id: channel.id },
	});

	for (const member of [staff, makeMember(guild)]) {
		const interaction = makeInteraction({
			channel,
			member,
		});
		await runComponent(EditButton, client, {}, interaction);
		assert.equal(interaction.responses[0].kind, 'reply');
		assert.match(embedText(interaction.responses[0].data), /isn't your ticket/i);
	}

	const own = makeInteraction({
		channel,
		member: creator,
	});
	await runComponent(EditButton, client, {}, own);
	assert.equal(own.responses[0].kind, 'showModal');
});
