const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	seedCategory, useTestClient,
} = require('../helpers/client');
const {
	embedText, makeGuild, makeInteraction, makeMember, makeRole,
} = require('../helpers/discord');

const ctx = useTestClient();

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
	const [channel] = guild.created;
	return {
		category,
		channel,
		client,
		creator,
		guild,
		staff,
	};
}

const close = async (client, member, channel, reason) => {
	const interaction = makeInteraction({
		channel,
		member,
		options: { reason },
		type: 'command',
	});
	await client.tickets.beforeRequestClose(interaction);
	return interaction;
};

test('staff close requests ask the creator, and are remembered for auto-close', async () => {
	const {
		client, channel, creator, staff,
	} = await openTicket();
	const interaction = await close(client, staff, channel, 'solved');
	const request = interaction.responses.find(r => r.kind === 'editReply');
	assert.equal(request.data.content, `<@${creator.id}>`);
	assert.match(embedText(request.data), /close/i);
	const pending = client.tickets.$stale.get(channel.id);
	assert.equal(pending.closedBy, staff.id);
	assert.equal(pending.reason, 'solved');
	assert.ok(pending.closeAt > Date.now(), 'auto-close is on by default');

	const ticket = await client.prisma.ticket.findUnique({ where: { id: channel.id } });
	assert.equal(ticket.open, true);
});

test('with close requests turned off, the ticket closes straight away (upstream #406)', async () => {
	const {
		client, channel, staff,
	} = await openTicket({ settings: { closeRequests: false } });
	await close(client, staff, channel, 'done');
	const ticket = await client.prisma.ticket.findUnique({ where: { id: channel.id } });
	assert.equal(ticket.open, false);
	assert.equal(ticket.closedById, staff.id);
	assert.notEqual(ticket.closedReason, 'done', 'the reason is encrypted');
	assert.ok(ticket.closedAt);
	assert.equal(channel.deleted, true, 'the channel is deleted');
	assert.equal(channel.deleteReason, `Ticket closed by ${staff.displayName}: done`);
	assert.equal(client.tickets.$stale.has(channel.id), false);
});

test('members who aren\'t the creator or staff can\'t close (and get a reply)', async () => {
	const {
		client, channel, guild,
	} = await openTicket();
	const stranger = makeMember(guild);
	const interaction = await close(client, stranger, channel);
	assert.equal(interaction.responses[0].kind, 'reply');
	assert.match(embedText(interaction.responses[0].data), /can't|cannot|not allowed|permission/i);
	assert.equal((await client.prisma.ticket.findUnique({ where: { id: channel.id } })).open, true);
});

test('closing outside a ticket is an error', async () => {
	const { client } = ctx;
	const guild = makeGuild(client);
	await client.prisma.guild.create({ data: { id: guild.id } });
	const { makeTextChannel } = require('../helpers/discord');
	const interaction = await close(client, makeMember(guild), makeTextChannel(guild));
	assert.match(embedText(interaction.responses.at(-1).data), /ticket/i);
});
