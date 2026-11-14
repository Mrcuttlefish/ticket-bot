// Ticket Tool parity, P3: thread-style tickets (private threads in a text channel instead of channels)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ChannelType } = require('discord.js');
const {
	seedCategory, useTestClient,
} = require('../helpers/client');
const {
	embedText, makeGuild, makeInteraction, makeMember, makeRole, makeTextChannel, runComponent,
} = require('../helpers/discord');
const { createTestAPI } = require('../helpers/api');
const AddSlashCommand = require('../../src/commands/slash/add');
const RemoveSlashCommand = require('../../src/commands/slash/remove');
const MoveSlashCommand = require('../../src/commands/slash/move');
const ReopenButton = require('../../src/buttons/reopen');
const ThreadDelete = require('../../src/listeners/client/threadDelete');

const ctx = useTestClient();

async function setup(seed = {}) {
	const { client } = ctx;
	const guild = makeGuild(client);
	const staffRole = makeRole(guild);
	const parent = makeTextChannel(guild, { name: 'support' });
	const { category } = await seedCategory(client, guild, {
		channelType: 'THREAD',
		memberLimit: 10,
		staffRoles: [staffRole.id],
		threadParent: parent.id,
		...seed,
	});
	const creator = makeMember(guild);
	const staff = makeMember(guild, { roles: [staffRole.id] });
	const open = async (member = creator) => {
		await client.keyv.clear();
		await client.tickets.create({
			categoryId: category.id,
			interaction: makeInteraction({ member }),
		});
		await client.tickets.settle();
		return parent.threads.created.at(-1);
	};
	const command = async (Command, member, channel, options = {}) => {
		const interaction = makeInteraction({
			channel,
			member,
			options,
			type: 'command',
		});
		await runComponent(Command, client, interaction);
		return interaction;
	};
	return {
		category,
		client,
		command,
		creator,
		guild,
		open,
		parent,
		staff,
		staffRole,
	};
}

test('thread tickets: a private thread in the chosen channel, with the creator and staff added', async () => {
	const {
		client, creator, guild, open, parent, staffRole,
	} = await setup({ ratelimit: 10 });
	const thread = await open();
	assert.ok(thread, 'a thread was created');
	assert.equal(guild.created.length, 0, 'no channel was created');
	assert.equal(thread.parentId, parent.id);
	assert.equal(thread.options.type, ChannelType.PrivateThread);
	assert.equal(thread.options.invitable, false, 'members can\'t invite others');
	assert.equal(thread.name, 'ticket-1');
	assert.equal(thread.rateLimitPerUser, 10);
	assert.ok(thread.members.cache.has(creator.id));
	const mention = thread.sent.find(m => m.content === `<@&${staffRole.id}>`);
	assert.ok(mention, 'the staff roles are mentioned to add them');
	assert.deepEqual(mention.allowedMentions, { roles: [staffRole.id] });

	const ticket = await client.prisma.ticket.findUnique({ where: { id: thread.id } });
	assert.ok(ticket.open);
	assert.ok(thread.sent.some(m => embedText(m).length > 0), 'the opening message is sent in the thread');
});

test('thread tickets: /add and /remove add members to and remove them from the thread', async () => {
	const {
		command, guild, open, staff,
	} = await setup();
	const thread = await open();
	const friend = makeMember(guild);
	await command(AddSlashCommand, staff, thread, { member: friend });
	assert.ok(thread.members.cache.has(friend.id));
	assert.equal(thread.permissionOverwrites.cache.size, 0, 'threads have no overwrites of their own');
	await command(RemoveSlashCommand, staff, thread, { member: friend });
	assert.ok(!thread.members.cache.has(friend.id));
});

test('thread tickets: claiming works, but can\'t hide the ticket from other staff', async () => {
	const {
		client, open, staff,
	} = await setup({
		claimHide: true,
		claiming: true,
	});
	const thread = await open();
	await client.tickets.claim(makeInteraction({
		channel: thread,
		member: staff,
	}));
	const ticket = await client.prisma.ticket.findUnique({ where: { id: thread.id } });
	assert.equal(ticket.claimedById, staff.id);
	assert.ok(thread.members.cache.has(staff.id));
	assert.equal(thread.permissionOverwrites.cache.size, 0);
});

test('thread tickets: kept closed threads are locked without the creator, and reopening adds them back', async () => {
	const {
		client, creator, open, staff,
	} = await setup({ keepClosedFor: 0 });
	const thread = await open();
	await thread.members.add(staff.id);
	await client.tickets.finallyClose(thread.id, { closedBy: staff.id });
	await client.tickets.settle();
	assert.equal(thread.deleted, false, 'kept');
	assert.equal(thread.locked, true);
	assert.ok(!thread.members.cache.has(creator.id), 'the creator was taken out');
	assert.ok(thread.members.cache.has(staff.id), 'staff stay');

	await runComponent(ReopenButton, client, {}, makeInteraction({
		channel: thread,
		member: staff,
		message: thread.messages.cache.last(),
	}));
	assert.equal(thread.locked, false);
	assert.ok(thread.members.cache.has(creator.id));
	assert.equal((await client.prisma.ticket.findUnique({ where: { id: thread.id } })).open, true);
});

test('thread tickets: /move is refused, and deleting the thread closes the ticket', async () => {
	const {
		client, command, guild, open, staff, staffRole,
	} = await setup();
	const { category: other } = await seedCategory(client, guild, { staffRoles: [staffRole.id] });
	const thread = await open();
	const interaction = await command(MoveSlashCommand, staff, thread, { category: other.id });
	assert.match(embedText(interaction.responses.at(-1).data), /can't be moved/);

	await runComponent(ThreadDelete, client, thread);
	assert.equal((await client.prisma.ticket.findUnique({ where: { id: thread.id } })).open, false);
});

test('admin API: thread tickets need a text channel in the server', async () => {
	const { client } = ctx;
	const api = await createTestAPI(client);
	const guild = makeGuild(client);
	const admin = makeMember(guild, { admin: true });
	const text = makeTextChannel(guild);
	const otherGuild = makeGuild(client);
	const elsewhere = makeTextChannel(otherGuild);
	const { category } = await seedCategory(client, guild, {});
	const url = `/api/admin/guilds/${guild.id}/categories/${category.id}`;
	const patch = body => api.as(admin.id)('PATCH', url, body);
	assert.equal((await patch({
		channelType: 'THREAD',
		threadParent: null,
	})).status, 400, 'a channel is needed');
	assert.equal((await patch({
		channelType: 'THREAD',
		threadParent: elsewhere.id,
	})).status, 400, 'not another server\'s channel');
	assert.equal((await patch({
		channelType: 'THREAD',
		threadParent: category.discordCategory,
	})).status, 400, 'not a category channel');
	assert.equal((await patch({ channelType: 'FORUM' })).status, 400);
	const res = await patch({
		channelType: 'THREAD',
		threadParent: text.id,
	});
	assert.equal(res.status, 200, res.text);
	assert.equal(res.body.channelType, 'THREAD');
	assert.equal(res.body.threadParent, text.id);
});
