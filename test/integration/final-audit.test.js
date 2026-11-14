const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	seedCategory, useTestClient,
} = require('../helpers/client');
const {
	makeGuild, makeInteraction, makeMember, makeRole, makeUser,
} = require('../helpers/discord');
const { createTestAPI } = require('../helpers/api');

const ctx = useTestClient();
let api;

process.env.HTTP_EXTERNAL ??= 'https://tickets.example.com';

async function setup(seed = {}) {
	const { client } = ctx;
	api ??= await createTestAPI(client);
	const guild = makeGuild(client);
	const supportRole = makeRole(guild);
	const hrRole = makeRole(guild);
	const { category: support } = await seedCategory(client, guild, {
		memberLimit: 10,
		staffRoles: [supportRole.id],
		...seed,
	});
	const { category: hr } = await seedCategory(client, guild, {
		memberLimit: 10,
		name: 'HR',
		staffRoles: [hrRole.id],
	});
	const creator = makeMember(guild, { user: makeUser({ username: 'casey' }) });
	const supportStaff = makeMember(guild, { roles: [supportRole.id] });
	const otherSupportStaff = makeMember(guild, { roles: [supportRole.id] });
	const hrStaff = makeMember(guild, { roles: [hrRole.id] });
	const manager = makeMember(guild, { admin: true });
	const open = async (category, topic) => {
		await client.keyv.clear(); // the creation rate limit and staff role cache
		await client.tickets.create({
			categoryId: category.id,
			interaction: makeInteraction({ member: creator }),
			topic,
		});
		return guild.created[guild.created.length - 1];
	};
	return {
		client,
		creator,
		guild,
		hr,
		hrStaff,
		manager,
		open,
		otherSupportStaff,
		support,
		supportStaff,
		url: `/api/guilds/${guild.id}/tickets`,
	};
}

test('portal: staff only see tickets in the categories they are staff for', async () => {
	const {
		hr, hrStaff, manager, open, support, supportStaff, url,
	} = await setup();
	const supportTicket = await open(support, 'Order missing');
	const hrTicket = await open(hr, 'Complaint about a moderator');

	let res = await api.as(supportStaff.id)('GET', url);
	assert.equal(res.status, 200, res.text);
	assert.deepEqual(res.body.tickets.map(t => t.topic), ['Order missing'], 'support staff don\'t see HR tickets');

	res = await api.as(hrStaff.id)('GET', url);
	assert.deepEqual(res.body.tickets.map(t => t.topic), ['Complaint about a moderator']);

	res = await api.as(manager.id)('GET', url);
	assert.equal(res.body.tickets.length, 2, 'server managers see everything');

	res = await api.as(supportStaff.id)('GET', `${url}/${hrTicket.id}`);
	assert.equal(res.status, 404);
	res = await api.as(supportStaff.id)('GET', `${url}/${hrTicket.id}/messages`);
	assert.equal(res.status, 404);
	res = await api.as(supportStaff.id)('POST', `${url}/${hrTicket.id}/messages`, { content: 'hi' });
	assert.equal(res.status, 404, 'can\'t reply to tickets in other categories');
	res = await api.as(supportStaff.id)('POST', `${url}/${hrTicket.id}/close`, {});
	assert.equal(res.status, 404, 'or close them');

	res = await api.as(supportStaff.id)('GET', `${url}/${supportTicket.id}`);
	assert.equal(res.status, 200);
	assert.equal(res.body.permissions.isStaff, true);
});

test('portal: claimed tickets are hidden from other staff when the category hides them', async () => {
	const {
		client, creator, open, otherSupportStaff, support, supportStaff, url,
	} = await setup({
		claimHide: true,
		claiming: true,
	});
	const channel = await open(support, 'Claimed one');
	await client.prisma.ticket.update({
		data: { claimedById: supportStaff.user.id },
		where: { id: channel.id },
	}).catch(async () => {
		await client.prisma.user.create({ data: { id: supportStaff.user.id } });
		await client.prisma.ticket.update({
			data: { claimedById: supportStaff.user.id },
			where: { id: channel.id },
		});
	});

	let res = await api.as(otherSupportStaff.id)('GET', url);
	assert.equal(res.body.tickets.length, 0);
	res = await api.as(otherSupportStaff.id)('GET', `${url}/${channel.id}`);
	assert.equal(res.status, 404);
	res = await api.as(supportStaff.id)('GET', `${url}/${channel.id}`);
	assert.equal(res.status, 200, 'the claimer can still see it');
	res = await api.as(creator.id)('GET', `${url}/${channel.id}`);
	assert.equal(res.status, 200, 'and so can the creator');

	await client.prisma.ticket.update({
		data: { open: false },
		where: { id: channel.id },
	});
	res = await api.as(otherSupportStaff.id)('GET', `${url}/${channel.id}`);
	assert.equal(res.status, 200, 'closed tickets are visible to the category\'s staff, like /transcript');
});

test('admin API: anonymous tickets don\'t reveal staff to admins', async () => {
	const {
		client, creator, guild, manager, open, support, supportStaff,
	} = await setup({ anonymous: true });
	const channel = await open(support, 'Secret');
	await client.prisma.user.upsert({
		create: { id: supportStaff.user.id },
		update: {},
		where: { id: supportStaff.user.id },
	});
	await client.prisma.ticket.update({
		data: {
			claimedById: supportStaff.user.id,
			closedById: supportStaff.user.id,
		},
		where: { id: channel.id },
	});
	await client.tickets.archiver.saveMessage(channel.id, {
		attachments: new Map(),
		author: supportStaff.user,
		components: [],
		content: 'hello from staff',
		createdAt: new Date(),
		editedAt: null,
		embeds: [],
		guild,
		id: '123456789012345678',
		member: supportStaff,
		mentions: {
			channels: new Map(),
			members: new Map(),
			roles: new Map(),
		},
		reference: null,
	});

	const admin = api.as(manager.id);
	let res = await admin('GET', `/api/admin/guilds/${guild.id}/tickets`);
	assert.equal(res.status, 200, res.text);
	assert.equal(res.body[0].claimedById, '0');
	assert.equal(res.body[0].closedById, '0');
	assert.equal(res.body[0].createdById, creator.id);
	assert.ok(!res.text.includes(supportStaff.user.id));

	res = await admin('GET', `/api/admin/guilds/${guild.id}/tickets/${channel.id}`);
	assert.equal(res.status, 200, res.text);
	assert.ok(!res.text.includes(supportStaff.user.id), 'no staff ID anywhere in the ticket export');
	const exported = JSON.parse(res.text);
	assert.equal(exported.archivedMessages.find(m => m.id === '123456789012345678').authorId, '0');
	assert.ok(exported.archivedUsers.some(u => u.userId === '0' && u.username === 'Staff'));

	// the real author is still in the database
	const row = await client.prisma.archivedMessage.findUnique({ where: { id: '123456789012345678' } });
	assert.equal(row.authorId, supportStaff.user.id);
});

test('API keys can\'t create more API keys', async () => {
	const { manager } = await setup();
	let res = await api.as(manager.id)('GET', '/api/users/@me/key');
	assert.equal(res.status, 200, res.text);
	res = await api.as(manager.id, { service: true })('GET', '/api/users/@me/key');
	assert.equal(res.status, 403);
});
