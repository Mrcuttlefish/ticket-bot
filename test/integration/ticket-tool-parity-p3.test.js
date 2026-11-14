// Ticket Tool parity, P3: creator leaving, automations, auto-responses, change history, statistics,
// dashboard roles and button roles
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	seedCategory, useTestClient,
} = require('../helpers/client');
const {
	embedText, makeGuild, makeInteraction, makeMember, makeMessage, makeRole, runComponent,
} = require('../helpers/discord');
const { createTestAPI } = require('../helpers/api');
const GuildMemberRemove = require('../../src/listeners/client/guildMemberRemove');
const MessageCreate = require('../../src/listeners/client/messageCreate');
const ClaimButton = require('../../src/buttons/claim');
const { runAutomations } = require('../../src/lib/automations');

const ctx = useTestClient();
let api;
const getAPI = async () => (api ??= await createTestAPI(ctx.client));

async function eventually(fn, timeout = 3000) {
	const until = Date.now() + timeout;
	for (;;) {
		const result = await fn();
		if (result || Date.now() > until) return result;
		await new Promise(resolve => setTimeout(resolve, 25));
	}
}

async function setup(seed = {}, settings = {}) {
	const { client } = ctx;
	const guild = makeGuild(client);
	const staffRole = makeRole(guild);
	const { category } = await seedCategory(client, guild, {
		memberLimit: 10,
		settings,
		staffRoles: [staffRole.id],
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
		return guild.created.at(-1);
	};
	const say = async (channel, member, content = 'hello') => {
		const message = makeMessage(channel, {
			author: member.user,
			content,
		});
		await runComponent(MessageCreate, client, message);
		await new Promise(resolve => setTimeout(resolve, 50));
		return message;
	};
	return {
		category,
		client,
		creator,
		guild,
		open,
		say,
		staff,
		staffRole,
	};
}

test('creator leaving: tickets close by default, can stay open, or can be deleted straight away', async () => {
	const closing = await setup();
	let channel = await closing.open();
	await runComponent(GuildMemberRemove, closing.client, closing.creator);
	assert.equal((await closing.client.prisma.ticket.findUnique({ where: { id: channel.id } })).open, false);

	const keeping = await setup({ onCreatorLeave: 'KEEP' });
	channel = await keeping.open();
	await runComponent(GuildMemberRemove, keeping.client, keeping.creator);
	assert.equal((await keeping.client.prisma.ticket.findUnique({ where: { id: channel.id } })).open, true);
	const note = channel.sent.at(-1);
	assert.match(note.content, /left the server/);
	assert.deepEqual(note.allowedMentions, { parse: [] });

	// the category keeps closed channels, but DELETE doesn't
	const deleting = await setup({
		keepClosedFor: 0,
		onCreatorLeave: 'DELETE',
	});
	channel = await deleting.open();
	await runComponent(GuildMemberRemove, deleting.client, deleting.creator);
	const ticket = await deleting.client.prisma.ticket.findUnique({ where: { id: channel.id } });
	assert.equal(ticket.open, false);
	assert.equal(ticket.channelDeleteAt, null);
	assert.ok(await eventually(() => channel.deleted), 'the channel is deleted');
});

test('automations: who should reply next is tracked, and rules send a tag or close the ticket once', async () => {
	const minutes = n => n * 60 * 1000;
	const {
		client, guild, open, say, staff,
	} = await setup({
		automations: [
			{
				action: 'TAG',
				after: minutes(30),
				tag: 'waiting',
				waitingOn: 'STAFF',
			},
			{
				action: 'CLOSE',
				after: minutes(60),
				waitingOn: 'CREATOR',
			},
		],
	});
	await client.prisma.tag.create({
		data: {
			content: 'Sorry for the wait, {user}! Someone will be with you soon.',
			guildId: guild.id,
			name: 'waiting',
		},
	});
	const channel = await open();
	let ticket = await client.prisma.ticket.findUnique({ where: { id: channel.id } });
	assert.equal(ticket.waitingOn, 'STAFF', 'new tickets wait for staff');
	const start = ticket.createdAt.getTime();

	// not yet
	await runAutomations(client, start + minutes(20));
	const before = channel.sent.length;
	assert.equal(channel.sent.length, before);

	let result = await runAutomations(client, start + minutes(31));
	assert.equal(result.tagged, 1);
	const tagged = channel.sent.at(-1);
	assert.match(embedText(tagged), /Sorry for the wait, <@\d+>/);
	assert.deepEqual(tagged.allowedMentions, { users: [ticket.createdById] });
	// only once per wait
	result = await runAutomations(client, start + minutes(45));
	assert.equal(result.tagged, 0);

	// staff reply, so now it waits for the creator
	await say(channel, staff, 'how can we help?');
	ticket = await client.prisma.ticket.findUnique({ where: { id: channel.id } });
	assert.equal(ticket.waitingOn, 'CREATOR');
	const replied = ticket.lastMessageAt.getTime();
	result = await runAutomations(client, replied + minutes(59));
	assert.equal(result.closed, 0);
	result = await runAutomations(client, replied + minutes(61));
	assert.equal(result.closed, 1);
	ticket = await client.prisma.ticket.findUnique({ where: { id: channel.id } });
	assert.equal(ticket.open, false);
});

test('admin API: automation rules are validated', async () => {
	const { as } = await getAPI();
	const {
		category, guild,
	} = await setup();
	const admin = makeMember(guild, { admin: true });
	const url = `/api/admin/guilds/${guild.id}/categories/${category.id}`;
	const patch = automations => as(admin.id)('PATCH', url, { automations });
	assert.equal((await patch([{
		action: 'CLOSE',
		after: 60 * 1000,
		waitingOn: 'CREATOR',
	}])).status, 400, 'at least 15 minutes');
	assert.equal((await patch([{
		action: 'TAG',
		after: 60 * 60 * 1000,
		waitingOn: 'STAFF',
	}])).status, 400, 'a tag rule needs a tag');
	assert.equal((await patch([{
		action: 'BAN',
		after: 60 * 60 * 1000,
		waitingOn: 'STAFF',
	}])).status, 400);
	assert.equal((await patch(Array.from({ length: 11 }, () => ({
		action: 'CLOSE',
		after: 60 * 60 * 1000,
		waitingOn: 'STAFF',
	})))).status, 400, 'at most 10 rules');
	const res = await patch([{
		action: 'TAG',
		after: 60 * 60 * 1000,
		extra: 'dropped',
		tag: 'waiting',
		waitingOn: 'STAFF',
	}]);
	assert.equal(res.status, 200, res.text);
	assert.deepEqual(res.body.automations, [{
		action: 'TAG',
		after: 60 * 60 * 1000,
		tag: 'waiting',
		waitingOn: 'STAFF',
	}]);
});

test('auto-responses: wildcard triggers, and responses sent in a DM (or as a reply if DMs are closed)', async () => {
	const {
		client, creator, guild, say,
	} = await setup({}, { autoTag: 'all' });
	await client.prisma.tag.create({
		data: {
			autoDm: true,
			content: 'You can reset it in your account settings.',
			guildId: guild.id,
			matchType: 'WILDCARD',
			name: 'reset',
			regex: 'how do i reset my *',
		},
	});
	const { makeTextChannel } = require('../helpers/discord');
	const general = makeTextChannel(guild);
	const dms = [];
	creator.user.send = async payload => {
		dms.push(payload);
		return {};
	};
	await say(general, creator, 'is the shop open?');
	assert.equal(dms.length, 0);
	await say(general, creator, 'How do I reset my password');
	assert.equal(dms.length, 1);
	assert.match(embedText(dms[0]), /account settings/);
	assert.equal(general.sent.length, 0, 'nothing is posted in the channel');

	creator.user.send = async () => {
		throw new Error('Cannot send messages to this user');
	};
	await say(general, creator, 'how do i reset my email?');
	assert.equal(general.sent.length, 1, 'it replies instead');
	assert.match(embedText(general.sent[0]), /account settings/);
});

test('admin API: tag triggers are checked for their match type', async () => {
	const { as } = await getAPI();
	const { guild } = await setup();
	const admin = makeMember(guild, { admin: true });
	const url = `/api/admin/guilds/${guild.id}/tags`;
	let res = await as(admin.id)('POST', url, {
		content: 'x',
		matchType: 'WILDCARD',
		name: 'many',
		regex: 'a*b*c*d*e*f*g',
	});
	assert.equal(res.status, 400, 'too many wildcards');
	// "(a+)+" isn't a safe regex, but it's fine as a wildcard pattern
	res = await as(admin.id)('POST', url, {
		content: 'x',
		matchType: 'WILDCARD',
		name: 'literal',
		regex: '(a+)+',
	});
	assert.equal(res.status, 200, res.text);
	// changing it to a regex checks the pattern again
	res = await as(admin.id)('PATCH', `${url}/${res.body.id}`, { matchType: 'REGEX' });
	assert.equal(res.status, 200, res.text);
	res = await as(admin.id)('PATCH', `${url}/${res.body.id}`, { regex: '(a+)+$' });
	assert.equal(res.status, 400, 'unsafe as a regex');
	assert.equal((await as(admin.id)('POST', url, {
		content: 'x',
		matchType: 'GLOB',
		name: 'bad',
	})).status, 400);
});

test('change history: dashboard changes are stored without secrets and can be read back', async () => {
	const { as } = await getAPI();
	const {
		category, client, guild,
	} = await setup();
	const admin = makeMember(guild, { admin: true });
	const settingsURL = `/api/admin/guilds/${guild.id}/settings`;
	let res = await as(admin.id)('PATCH', settingsURL, {
		primaryColour: '#123456',
		webhookSecret: 'super-secret-value',
	});
	assert.equal(res.status, 200, res.text);
	res = await as(admin.id)('PATCH', `/api/admin/guilds/${guild.id}/categories/${category.id}`, { name: 'Renamed' });
	assert.equal(res.status, 200, res.text);
	await client.tickets.settle();

	const rows = await client.prisma.auditLog.findMany({ where: { guildId: guild.id } });
	assert.ok(rows.length >= 2);
	assert.ok(!JSON.stringify(rows).includes('super-secret-value'), 'the secret is never stored');

	res = await as(admin.id)('GET', `/api/admin/guilds/${guild.id}/history`);
	assert.equal(res.status, 200, res.text);
	const [latest, previous] = res.body.entries;
	assert.equal(latest.target.type, 'category');
	assert.ok(latest.changes.some(c => c.field === 'name' && c.to === 'Renamed'));
	assert.equal(latest.user.id, admin.id);
	assert.equal(previous.target.type, 'settings');
	assert.ok(previous.changes.some(c => c.field === 'primaryColour' && c.to === '#123456'));
	assert.ok(!previous.changes.some(c => /secret/i.test(c.field)));

	res = await as(admin.id)('GET', `/api/admin/guilds/${guild.id}/history?type=settings`);
	assert.ok(res.body.entries.every(e => e.target.type === 'settings'));
	res = await as(admin.id)('GET', `/api/admin/guilds/${guild.id}/history?limit=1`);
	assert.equal(res.body.entries.length, 1);
	assert.ok(res.body.next);
	res = await as(admin.id)('GET', `/api/admin/guilds/${guild.id}/history?limit=1&before=${res.body.next}`);
	assert.equal(res.body.entries[0].target.type, 'settings');
	assert.equal((await as(admin.id)('GET', `/api/admin/guilds/${guild.id}/history?type=users`)).status, 400);

	// another server's history isn't visible
	const other = makeGuild(client);
	const otherAdmin = makeMember(other, { admin: true });
	await client.prisma.guild.create({ data: { id: other.id } });
	res = await as(otherAdmin.id)('GET', `/api/admin/guilds/${other.id}/history`);
	assert.deepEqual(res.body.entries, []);
	assert.equal((await as(otherAdmin.id)('GET', `/api/admin/guilds/${guild.id}/history`)).status, 403);
});

test('statistics: tickets per day and category, and per-staff counts that leave anonymous categories out', async () => {
	const { as } = await getAPI();
	const {
		category, client, creator, guild, staff,
	} = await setup();
	const { category: anonymous } = await seedCategory(client, guild, {
		anonymous: true,
		staffRoles: [],
	});
	const admin = makeMember(guild, { admin: true });
	const now = Date.now();
	const ticket = (n, categoryId, extra = {}) => client.prisma.ticket.create({
		data: {
			categoryId,
			createdAt: new Date(now - (2 * 24 * 60 * 60 * 1000)),
			createdById: creator.id,
			guildId: guild.id,
			id: String(BigInt(guild.id) + BigInt(n)),
			number: n,
			openingMessageId: '1',
			...extra,
		},
	});
	await client.prisma.user.createMany({ data: [{ id: creator.id }, { id: staff.id }] });
	await ticket(1, category.id, {
		claimedById: staff.id,
		closedAt: new Date(now - (24 * 60 * 60 * 1000)),
		closedById: staff.id,
		open: false,
	});
	await ticket(2, category.id);
	await ticket(3, anonymous.id, {
		claimedById: staff.id,
		closedAt: new Date(now - (24 * 60 * 60 * 1000)),
		closedById: staff.id,
		open: false,
	});
	const res = await as(admin.id)('GET', `/api/admin/guilds/${guild.id}/statistics?days=7`);
	assert.equal(res.status, 200, res.text);
	assert.equal(res.body.days.length, 7);
	assert.equal(res.body.totals.created, 3);
	assert.equal(res.body.totals.closed, 2);
	assert.equal(res.body.categories.find(c => c.id === category.id).created, 2);
	assert.equal(res.body.categories.find(c => c.id === anonymous.id).closed, 1);
	const counts = res.body.staff.find(s => s.id === staff.id);
	assert.equal(counts.claimed, 1, 'the anonymous ticket isn\'t counted');
	assert.equal(counts.closed, 1);
	assert.equal(res.body.open, 1);
});

test('dashboard roles: settings without Manage Server, but no resetting, exporting or changing dashboard roles', async () => {
	const { as } = await getAPI();
	const {
		category, client, guild,
	} = await setup();
	const dashboardRole = makeRole(guild, { name: 'dashboard' });
	const admin = makeMember(guild, { admin: true });
	const helper = makeMember(guild, { roles: [dashboardRole.id] });
	const nobody = makeMember(guild);
	const base = `/api/admin/guilds/${guild.id}`;

	assert.equal((await as(helper.id)('GET', `${base}/settings`)).status, 403, 'not before the role is added');
	let res = await as(admin.id)('PATCH', `${base}/settings`, { dashboardRoles: [dashboardRole.id, guild.id, '123456789012345678'] });
	assert.equal(res.status, 200, res.text);
	assert.deepEqual(res.body.dashboardRoles, [dashboardRole.id], '@everyone and unknown roles are dropped');

	assert.equal((await as(helper.id)('GET', `${base}/settings`)).status, 200);
	res = await as(helper.id)('PATCH', `${base}/categories/${category.id}`, { name: 'By a helper' });
	assert.equal(res.status, 200, res.text);
	res = await as(helper.id)('GET', base);
	assert.equal(res.body.viaDashboardRole, true);
	assert.equal(res.body.canManageData, false);

	// saving the same dashboard roles is fine (the dashboard sends every setting), changing them isn't
	assert.equal((await as(helper.id)('PATCH', `${base}/settings`, {
		dashboardRoles: [dashboardRole.id],
		primaryColour: '#abcdef',
	})).status, 200);
	assert.equal((await as(helper.id)('PATCH', `${base}/settings`, { dashboardRoles: [] })).status, 403);
	assert.equal((await as(helper.id)('DELETE', base)).status, 403, 'no resetting the server');
	assert.equal((await as(helper.id)('GET', `${base}/export`)).status, 403, 'no exporting');
	assert.equal((await as(nobody.id)('GET', `${base}/settings`)).status, 403);
	const settings = await client.prisma.guild.findUnique({ where: { id: guild.id } });
	assert.deepEqual(settings.dashboardRoles, [dashboardRole.id]);
});

test('button roles: buttons can be limited to roles, and Manage Server can always use them', async () => {
	const {
		client, guild, open, staff, staffRole,
	} = await setup({ claiming: true }, {
		buttons: {
			claim: {
				allow: [],
				deny: [],
			},
		},
	});
	const seniorRole = makeRole(guild, { name: 'senior' });
	const traineeRole = makeRole(guild, { name: 'trainee' });
	await client.prisma.guild.update({
		data: {
			buttons: {
				claim: {
					allow: [seniorRole.id, staffRole.id],
					deny: [traineeRole.id],
				},
			},
		},
		where: { id: guild.id },
	});
	const channel = await open();
	const click = async member => {
		const interaction = makeInteraction({
			channel,
			member,
		});
		await runComponent(ClaimButton, client, {}, interaction);
		return interaction;
	};
	const trainee = makeMember(guild, { roles: [staffRole.id, traineeRole.id] });
	let interaction = await click(trainee);
	assert.match(embedText(interaction.responses[0].data), /can't use this button/);
	assert.equal((await client.prisma.ticket.findUnique({ where: { id: channel.id } })).claimedById, null);

	const outsider = makeMember(guild);
	interaction = await click(outsider);
	assert.match(embedText(interaction.responses[0].data), /can't use this button/);

	const admin = makeMember(guild, {
		admin: true,
		roles: [traineeRole.id],
	});
	interaction = await click(admin);
	assert.doesNotMatch(embedText(interaction.responses[0]?.data), /can't use this button/);

	interaction = await click(staff);
	assert.doesNotMatch(embedText(interaction.responses[0]?.data), /can't use this button/);
});

test('admin API: button role limits are validated', async () => {
	const { as } = await getAPI();
	const { guild } = await setup();
	const admin = makeMember(guild, { admin: true });
	const url = `/api/admin/guilds/${guild.id}/settings`;
	assert.equal((await as(admin.id)('PATCH', url, { buttons: { close: { allow: ['nope'] } } })).status, 400);
	assert.equal((await as(admin.id)('PATCH', url, { buttons: { close: { deny: Array.from({ length: 26 }, (_, i) => String(100000000000000000n + BigInt(i))) } } })).status, 400);
	const res = await as(admin.id)('PATCH', url, {
		buttons: {
			close: {
				allow: [],
				deny: ['100000000000000001', '100000000000000001'],
			},
		},
	});
	assert.equal(res.status, 200, res.text);
	assert.deepEqual(res.body.buttons, { close: { deny: ['100000000000000001'] } });
});
