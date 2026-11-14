// Fixes from the review of the fork: tickets and channels in other servers, staff of other categories, slow tag
// patterns, and thread tickets
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	seedCategory, useTestClient,
} = require('../helpers/client');
const {
	embedText, makeGuild, makeInteraction, makeMember, makeMessage, makeRole, makeTextChannel, runComponent,
} = require('../helpers/discord');
const { testWithTimeout } = require('../../src/lib/security');
const AddSlashCommand = require('../../src/commands/slash/add');
const ForceCloseSlashCommand = require('../../src/commands/slash/force-close');
const MessageCreate = require('../../src/listeners/client/messageCreate');

const ctx = useTestClient();

const command = async (client, Command, member, channel, options = {}) => {
	const interaction = makeInteraction({
		channel,
		member,
		options,
		type: 'command',
	});
	await runComponent(Command, client, interaction);
	return interaction;
};

async function setup(seed = {}) {
	const { client } = ctx;
	const guild = makeGuild(client);
	const staffRole = makeRole(guild);
	const otherRole = makeRole(guild);
	const { category } = await seedCategory(client, guild, {
		claimHide: true,
		claiming: true,
		memberLimit: 10,
		staffRoles: [staffRole.id],
		...seed,
	});
	const other = await seedCategory(client, guild, {
		name: 'Other',
		staffRoles: [otherRole.id],
	});
	const creator = makeMember(guild);
	const staff = makeMember(guild, { roles: [staffRole.id] });
	const otherStaff = makeMember(guild, { roles: [otherRole.id] });
	const open = async (member = creator) => {
		await client.keyv.clear();
		const before = new Set(guild.created);
		await client.tickets.create({
			categoryId: category.id,
			interaction: makeInteraction({ member }),
		});
		await client.tickets.settle();
		return guild.created.find(channel => !before.has(channel));
	};
	return {
		category,
		client,
		creator,
		guild,
		open,
		other: other.category,
		otherStaff,
		staff,
	};
}

test('a slow tag pattern stops after a time limit instead of freezing the bot', () => {
	const started = Date.now();
	// passes the nested quantifier check, but takes minutes on this text without a limit
	assert.equal(testWithTimeout(/(a|a)*$/, 'a'.repeat(40) + 'b'), false);
	assert.ok(Date.now() - started < 2000);
	assert.equal(testWithTimeout(/refund/i, 'I want a REFUND'), true);
	assert.equal(testWithTimeout(/refund/i, 'hello'), false);
});

test('/add: staff of another category, or of another server, can\'t add members to a ticket', async () => {
	const {
		client, guild, open, otherStaff, staff,
	} = await setup();
	const channel = await open();
	const elsewhere = makeTextChannel(guild, { name: 'general' });
	const friend = makeMember(guild);

	await command(client, AddSlashCommand, otherStaff, elsewhere, {
		member: friend,
		ticket: channel.id,
	});
	assert.ok(!channel.permissionOverwrites.cache.has(friend.id), 'staff of another category');

	const otherGuild = makeGuild(client);
	const role = makeRole(otherGuild);
	await seedCategory(client, otherGuild, { staffRoles: [role.id] });
	const outsider = makeMember(otherGuild, { roles: [role.id] });
	const interaction = await command(client, AddSlashCommand, outsider, makeTextChannel(otherGuild), {
		member: outsider,
		ticket: channel.id,
	});
	assert.ok(!channel.permissionOverwrites.cache.has(outsider.id), 'staff of another server');
	assert.match(embedText(interaction.responses.at(-1).data), /ticket/i);

	await command(client, AddSlashCommand, staff, elsewhere, {
		member: friend,
		ticket: channel.id,
	});
	assert.ok(channel.permissionOverwrites.cache.has(friend.id), 'the category\'s own staff can');
});

test('claiming: staff of another category can\'t claim (and hide) a ticket they opened', async () => {
	const {
		client, open, otherStaff, staff,
	} = await setup();
	const channel = await open(otherStaff);
	await client.tickets.claim(makeInteraction({
		channel,
		member: otherStaff,
	}));
	let ticket = await client.prisma.ticket.findUnique({ where: { id: channel.id } });
	assert.equal(ticket.claimedById, null);
	await client.tickets.claim(makeInteraction({
		channel,
		member: staff,
	}));
	ticket = await client.prisma.ticket.findUnique({ where: { id: channel.id } });
	assert.equal(ticket.claimedById, staff.id);
});

test('/force-close: staff can only close tickets in their own categories', async () => {
	const {
		client, guild, open, otherStaff,
	} = await setup();
	const channel = await open();
	const interaction = await command(client, ForceCloseSlashCommand, otherStaff, makeTextChannel(guild), { ticket: channel.id });
	assert.doesNotMatch(embedText(interaction.responses.at(-1).data), /Ticket closed/);
	const ticket = await client.prisma.ticket.findUnique({ where: { id: channel.id } });
	assert.equal(ticket.open, true);
});

test('a ticket row never acts on another server\'s channel', async () => {
	const {
		category, client, creator, guild,
	} = await setup();
	// e.g. from an edited import file: an open ticket whose ID is a channel in another server
	const otherGuild = makeGuild(client);
	const victim = makeTextChannel(otherGuild, { name: 'private' });
	const member = makeMember(otherGuild);
	await client.prisma.ticket.create({
		data: {
			category: { connect: { id: category.id } },
			createdBy: {
				connectOrCreate: {
					create: { id: creator.id },
					where: { id: creator.id },
				},
			},
			guild: { connect: { id: guild.id } },
			id: victim.id,
			number: 999,
			openingMessageId: '100000000000000001',
		},
	});
	await client.prisma.guild.upsert({
		create: { id: otherGuild.id },
		update: {},
		where: { id: otherGuild.id },
	});

	const message = makeMessage(victim, {
		author: member.user,
		content: 'a secret',
	});
	await runComponent(MessageCreate, client, message);
	await new Promise(resolve => setTimeout(resolve, 50));
	assert.equal(await client.prisma.archivedMessage.count({ where: { ticketId: victim.id } }), 0, 'its messages aren\'t archived');

	await client.tickets.finallyClose(victim.id, { reason: 'test' });
	await client.tickets.settle();
	assert.notEqual(victim.deleted, true, 'the channel isn\'t deleted');
	assert.ok(client.channels.cache.has(victim.id));
});

test('thread tickets: a creator\'s message is handled without errors, and staff creators still wait for staff', async () => {
	const { client } = ctx;
	const guild = makeGuild(client);
	const staffRole = makeRole(guild);
	const parent = makeTextChannel(guild, { name: 'support' });
	const { category } = await seedCategory(client, guild, {
		channelType: 'THREAD',
		staffRoles: [staffRole.id],
		threadParent: parent.id,
	});
	const staff = makeMember(guild, { roles: [staffRole.id] });
	const creator = makeMember(guild);
	for (const member of [creator, staff]) {
		await client.keyv.clear();
		await client.tickets.create({
			categoryId: category.id,
			interaction: makeInteraction({ member }),
		});
		await client.tickets.settle();
		const thread = parent.threads.created.at(-1);
		await runComponent(MessageCreate, client, makeMessage(thread, {
			author: member.user,
			content: 'hello',
		}));
		await new Promise(resolve => setTimeout(resolve, 50));
		const ticket = await client.prisma.ticket.findUnique({ where: { id: thread.id } });
		assert.equal(ticket.waitingOn, 'STAFF');
	}
});
