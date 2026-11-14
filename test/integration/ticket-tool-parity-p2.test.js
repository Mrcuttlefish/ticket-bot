// Ticket Tool parity, P2: creator roles, lifecycle messages, staff threads, /move, closed names, schedules, limits, buttons
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PermissionsBitField } = require('discord.js');
const {
	seedCategory, useTestClient,
} = require('../helpers/client');
const {
	embedText, makeGuild, makeInteraction, makeMember, makeRole, runComponent,
} = require('../helpers/discord');
const { createTestAPI } = require('../helpers/api');
const ReopenButton = require('../../src/buttons/reopen');
const MoveSlashCommand = require('../../src/commands/slash/move');

const ctx = useTestClient();
let api;

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
	const open = async (member = creator, categoryId = category.id, topic) => {
		await client.keyv.clear(); // the creation rate limit and caches
		const interaction = makeInteraction({ member });
		await client.tickets.create({
			categoryId,
			interaction,
			topic,
		});
		return {
			channel: guild.created.at(-1),
			interaction,
		};
	};
	return {
		category,
		client,
		creator,
		guild,
		open,
		staff,
		staffRole,
	};
}

// background work after a ticket is created (roles, DM, staff thread)
const settle = () => new Promise(resolve => setTimeout(resolve, 50));
const closeNow = (client, channel, closedBy, reason = null) => client.tickets.finallyClose(channel.id, {
	closedBy,
	reason,
});

test('creator roles are added and removed when the ticket opens, is claimed and closes', async () => {
	const { client } = ctx;
	const g = makeGuild(client);
	const opened = makeRole(g, { name: 'in a ticket' });
	const claimed = makeRole(g, { name: 'being helped' });
	const member = makeRole(g, { name: 'member' });
	const {
		creator, open, staff,
	} = await (async () => {
		const staffRole = makeRole(g);
		const { category } = await seedCategory(client, g, {
			claiming: true,
			creatorRoles: {
				claim: {
					add: [claimed.id],
					remove: [],
				},
				close: {
					add: [],
					remove: [opened.id, claimed.id],
				},
				open: {
					add: [opened.id],
					remove: [member.id],
				},
			},
			staffRoles: [staffRole.id],
		});
		const c = makeMember(g, { roles: [member.id] });
		const s = makeMember(g, { roles: [staffRole.id] });
		return {
			creator: c,
			open: async () => {
				await client.keyv.clear();
				await client.tickets.create({
					categoryId: category.id,
					interaction: makeInteraction({ member: c }),
				});
				return g.created.at(-1);
			},
			staff: s,
		};
	})();
	const channel = await open();
	await settle();
	assert.equal(creator.roles.cache.has(opened.id), true, 'added on open');
	assert.equal(creator.roles.cache.has(member.id), false, 'removed on open');

	await client.tickets.claim(makeInteraction({
		channel,
		member: staff,
	}));
	assert.equal(creator.roles.cache.has(claimed.id), true, 'added on claim');

	await closeNow(client, channel, staff.id);
	assert.equal(creator.roles.cache.has(opened.id), false, 'removed on close');
	assert.equal(creator.roles.cache.has(claimed.id), false);
});

test('creator roles that became dangerous after they were saved are skipped', async () => {
	const { client } = ctx;
	const guild = makeGuild(client);
	const role = makeRole(guild, { name: 'helper' });
	const { category } = await seedCategory(client, guild, {
		creatorRoles: {
			open: {
				add: [role.id],
				remove: [],
			},
		},
	});
	// someone gave the role admin permissions in Discord
	role.permissions = new PermissionsBitField(PermissionsBitField.Flags.Administrator);
	const creator = makeMember(guild);
	await client.keyv.clear();
	await client.tickets.create({
		categoryId: category.id,
		interaction: makeInteraction({ member: creator }),
	});
	await settle();
	assert.equal(creator.roles.cache.has(role.id), false);
});

test('admin API: creator roles must be safe and manageable by the admin saving them', async () => {
	const { client } = ctx;
	api ??= await createTestAPI(client);
	const guild = makeGuild(client);
	const owner = makeMember(guild, { admin: true });
	guild.ownerId = owner.id;
	const managerRole = makeRole(guild, { position: 10 });
	const roleManager = makeMember(guild, {
		admin: true,
		permissions: PermissionsBitField.Flags.ManageRoles,
		roles: [managerRole.id],
	});
	const plainAdmin = makeMember(guild, { admin: true });
	const safe = makeRole(guild, { position: 5 });
	const high = makeRole(guild, { position: 20 });
	const dangerous = makeRole(guild, {
		permissions: PermissionsBitField.Flags.BanMembers,
		position: 2,
	});
	const managed = makeRole(guild, {
		managed: true,
		position: 2,
	});
	const aboveBot = makeRole(guild, { position: 150 });
	const { category } = await seedCategory(client, guild, {});
	const url = `/api/admin/guilds/${guild.id}/categories/${category.id}`;
	const patch = (member, roles) => api.as(member.id)('PATCH', url, {
		creatorRoles: {
			open: {
				add: roles,
				remove: [],
			},
		},
	});

	assert.equal((await patch(plainAdmin, [safe.id])).status, 400, 'Manage Server alone isn\'t enough to hand out roles');
	assert.equal((await patch(roleManager, [high.id])).status, 400, 'not a role above your own');
	assert.equal((await patch(roleManager, [dangerous.id])).status, 400, 'not a role with moderation permissions');
	assert.equal((await patch(owner, [dangerous.id])).status, 400, 'not even the owner');
	assert.equal((await patch(owner, [managed.id])).status, 400, 'not a managed role');
	assert.equal((await patch(owner, [aboveBot.id])).status, 400, 'not a role the bot can\'t manage');
	assert.equal((await patch(owner, [guild.id])).status, 400, 'not @everyone');
	let res = await patch(roleManager, [safe.id]);
	assert.equal(res.status, 200, res.text);
	assert.deepEqual(res.body.creatorRoles.open.add, [safe.id]);

	// another admin can still change other settings without touching the roles
	res = await api.as(plainAdmin.id)('PATCH', url, {
		creatorRoles: {
			open: {
				add: [safe.id],
				remove: [],
			},
		},
		name: 'Renamed',
	});
	assert.equal(res.status, 200, res.text);
});

test('lifecycle messages: an opening DM, a closed message and a reopened message, with placeholders', async () => {
	const {
		client, creator, open, staff,
	} = await setup({
		closedMessage: 'Closed after {age} because {reason}.',
		keepClosedFor: 0,
		openDm: 'Thanks {displayname}, ticket #{num} in {category} is open.',
		reopenedMessage: 'Welcome back {mention}!',
	});
	const { channel } = await open();
	await settle();
	const dm = creator.dms.find(d => embedText(d).includes('is open'));
	assert.ok(dm, 'opening DM sent');
	assert.match(embedText(dm), new RegExp(`Thanks ${creator.displayName}, ticket #1 in Support is open`));

	await closeNow(client, channel, staff.id, 'it was fixed');
	assert.match(embedText(channel.sent.at(-1)), /Closed after .+ because it was fixed\./);
	const closedDm = creator.dms.at(-1);
	assert.match(embedText(closedDm), /because it was fixed/);

	await runComponent(ReopenButton, client, {}, makeInteraction({
		channel,
		member: staff,
		message: channel.messages.cache.last(),
	}));
	assert.match(embedText(channel.sent.at(-1)), new RegExp(`Welcome back <@${creator.id}>!`));
});

test('lifecycle messages: an anonymous category\'s closed message doesn\'t name the claimer', async () => {
	const {
		client, creator, open, staff,
	} = await setup({
		anonymous: true,
		claiming: true,
		closedMessage: 'Handled by {claimer}',
	});
	const { channel } = await open();
	await client.tickets.claim(makeInteraction({
		channel,
		member: staff,
	}));
	await closeNow(client, channel, staff.id);
	const text = embedText(creator.dms.at(-1));
	assert.match(text, /Handled by Staff/);
	assert.ok(!text.includes(staff.id));
});

test('staff threads: a private thread is made in each ticket and staff are mentioned in it', async () => {
	const {
		open, staffRole,
	} = await setup({ staffThread: true });
	const { channel } = await open();
	await settle();
	assert.equal(channel.threads.created.length, 1);
	const [thread] = channel.threads.created;
	const { ChannelType } = require('discord.js');
	assert.equal(thread.type, ChannelType.PrivateThread);
	assert.equal(thread.options.invitable, false);
	assert.match(thread.sent[0].content, new RegExp(`<@&${staffRole.id}>`));
	assert.deepEqual(thread.sent[0].allowedMentions, { roles: [staffRole.id] });
});

test('closed channel names: kept channels are renamed when closed and back when reopened', async () => {
	const {
		client, open, staff,
	} = await setup({
		closedChannelName: 'closed-{num}',
		keepClosedFor: 0,
	});
	const { channel } = await open();
	assert.equal(channel.name, 'ticket-1');
	await closeNow(client, channel, staff.id);
	await settle();
	assert.equal(channel.name, 'closed-1');
	await runComponent(ReopenButton, client, {}, makeInteraction({
		channel,
		member: staff,
		message: channel.messages.cache.last(),
	}));
	assert.equal(channel.name, 'ticket-1');
});

test('working hours: a category can use its own hours and block tickets outside them', async () => {
	const closed = ['UTC', null, null, null, null, null, null, null]; // no working days
	const {
		guild, open,
	} = await setup({
		outOfHours: 'BLOCK',
		workingHours: closed,
	});
	const { interaction } = await open();
	assert.equal(guild.created.length, 0, 'no channel is made');
	assert.match(embedText(interaction.responses.at(-1).data), /outside working hours/i);
});

test('working hours: by default tickets outside working hours still open (with a warning)', async () => {
	const {
		guild, open,
	} = await setup({ workingHours: ['UTC', null, null, null, null, null, null, null] });
	await open();
	assert.equal(guild.created.length, 1);
});

test('limits: a server-wide limit of open tickets per member across categories', async () => {
	const {
		client, guild, open,
	} = await setup({}, { userLimit: 2 });
	const { category: other } = await seedCategory(client, guild, { memberLimit: 10 });
	await open();
	await open(undefined, other.id);
	const { interaction } = await open();
	assert.equal(guild.created.length, 2);
	assert.match(embedText(interaction.responses.at(-1).data), /too many open tickets/i);
});

test('limits: closed tickets with kept channels count towards the closed limit', async () => {
	const {
		client, guild, open, staff,
	} = await setup({
		closedLimit: 1,
		keepClosedFor: 0,
	});
	const { channel } = await open();
	await closeNow(client, channel, staff.id);
	const { interaction } = await open();
	assert.equal(guild.created.length, 1);
	assert.match(embedText(interaction.responses.at(-1).data), /too many closed tickets/i);

	// once staff delete the kept channel, there's room again
	await channel.delete();
	await open();
	assert.equal(guild.created.length, 2);
});

test('buttons: labels, emojis and colours can be customised', async () => {
	const { ButtonStyle } = require('discord.js');
	const { open } = await setup({ claiming: true }, {
		buttons: {
			claim: {
				label: 'Take it',
				style: 'SUCCESS',
			},
			close: {
				emoji: '🔒',
				label: 'Done',
			},
		},
		claimButton: true,
		closeButton: true,
	});
	const { channel } = await open();
	const row = channel.sent[0].components.find(c => c.components?.some(b => b.data.custom_id));
	const buttons = Object.fromEntries(row.components.map(b => [JSON.parse(b.data.custom_id).action, b.data]));
	assert.equal(buttons.claim.label, 'Take it');
	assert.equal(buttons.claim.style, ButtonStyle.Success);
	assert.equal(buttons.close.label, 'Done');
	assert.equal(buttons.close.emoji.name, '🔒');
	assert.equal(buttons.close.style, ButtonStyle.Danger, 'unchanged parts keep their defaults');
});

test('/move: a reason, releasing the claim and sending the new category\'s opening message', async () => {
	const {
		client, creator, guild, open, staff,
	} = await setup({ claiming: true }, {
		moveRelease: true,
		moveResend: true,
	});
	const otherStaff = makeRole(guild);
	const { category: target } = await seedCategory(client, guild, {
		claiming: true,
		name: 'Billing',
		openingMessage: 'Billing will help you, {name}.',
		staffRoles: [otherStaff.id],
	});
	const { channel } = await open();
	await client.tickets.claim(makeInteraction({
		channel,
		member: staff,
	}));
	const interaction = makeInteraction({
		channel,
		member: staff,
		options: {
			category: target.id,
			reason: 'payment problem',
		},
		type: 'command',
	});
	await runComponent(MoveSlashCommand, client, interaction);
	assert.match(embedText(interaction.responses.at(-1).data), /Billing[\s\S]*payment problem/);
	const ticket = await client.prisma.ticket.findUnique({ where: { id: channel.id } });
	assert.equal(ticket.categoryId, target.id);
	assert.equal(ticket.claimedById, null, 'released');
	const resent = channel.sent.at(-1);
	assert.match(embedText(resent), new RegExp(`Billing will help you, <@${creator.id}>`));
	assert.notEqual(ticket.openingMessageId, channel.sent[0].id, 'the new message holds the buttons');
	assert.deepEqual(resent.allowedMentions, { parse: [] });
});
