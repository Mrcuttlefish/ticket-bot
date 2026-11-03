// Ticket Tool parity, batch A: kept closed channels, transcript files, claiming options, log choices, opening styles
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	seedCategory, useTestClient,
} = require('../helpers/client');
const {
	embedText, makeCategoryChannel, makeGuild, makeInteraction, makeMember, makeRole, makeTextChannel, runComponent,
} = require('../helpers/discord');
const { deleteExpiredChannels } = require('../../src/lib/tickets/closed');
const { DETAILS_MARK } = require('../../src/lib/tickets/opening-message');
const ReopenButton = require('../../src/buttons/reopen');
const DeleteButton = require('../../src/buttons/delete');

const ctx = useTestClient();

async function openTicket(seed = {}, { topic } = {}) {
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
		topic,
	});
	const [channel] = guild.created;
	return {
		category,
		channel,
		client,
		creator,
		guild,
		staff,
		staffRole,
	};
}

const closeNow = (client, channel, closedBy, reason = null) => client.tickets.finallyClose(channel.id, {
	closedBy,
	reason,
});
const canView = (channel, id) => !channel.permissionOverwrites.cache.get(id)?.deny.has('ViewChannel');
const customIds = payload => (payload.components ?? []).flatMap(row => (row.components ?? []).map(c => JSON.parse(c.data.custom_id).action));

test('by default, closing a ticket still deletes its channel', async () => {
	const {
		channel, client, staff,
	} = await openTicket();
	await closeNow(client, channel, staff.id);
	assert.equal(channel.deleted, true);
	const ticket = await client.prisma.ticket.findUnique({ where: { id: channel.id } });
	assert.equal(ticket.open, false);
	assert.equal(ticket.channelDeleteAt, null);
});

test('kept channels: the creator loses access, staff keep it and get reopen, transcript and delete buttons', async () => {
	const {
		channel, client, creator, staff, staffRole,
	} = await openTicket({ keepClosedFor: 0 });
	await closeNow(client, channel, staff.id, 'fixed');
	assert.equal(channel.deleted, false);
	assert.equal(canView(channel, creator.id), false, 'the creator is locked out');
	assert.equal(canView(channel, staffRole.id), true, 'staff can still see it');
	assert.equal(canView(channel, client.user.id), true, 'the bot keeps access');
	const controls = channel.sent.at(-1);
	assert.deepEqual(customIds(controls), ['reopen', 'transcript', 'delete']);
	assert.match(embedText(controls), /closed/i);
	const ticket = await client.prisma.ticket.findUnique({ where: { id: channel.id } });
	assert.equal(ticket.open, false);
	assert.equal(ticket.channelDeleteAt, null, '0 keeps it until it is deleted by hand');
});

test('kept channels: commands and buttons for open tickets refuse to work once it is closed', async () => {
	const {
		channel, client, staff,
	} = await openTicket({ keepClosedFor: 0 });
	await closeNow(client, channel, staff.id);
	const claim = makeInteraction({
		channel,
		member: staff,
		type: 'command',
	});
	await client.tickets.claim(claim);
	assert.match(embedText(claim.responses.at(-1).data), /closed/i);
	const close = makeInteraction({
		channel,
		member: staff,
		type: 'command',
	});
	await client.tickets.beforeRequestClose(close);
	assert.match(embedText(close.responses.at(-1).data), /closed/i);
});

test('kept channels: messages after closing are not archived or counted as activity', async () => {
	const {
		channel, client, staff,
	} = await openTicket({ keepClosedFor: 0 });
	await closeNow(client, channel, staff.id);
	const before = await client.prisma.ticket.findUnique({ where: { id: channel.id } });
	const MessageCreate = require('../../src/listeners/client/messageCreate');
	const { makeMessage } = require('../helpers/discord');
	const message = makeMessage(channel, {
		author: staff.user,
		content: 'internal note',
		member: staff,
	});
	await runComponent(MessageCreate, client, message);
	const after = await client.prisma.ticket.findUnique({
		include: { _count: { select: { archivedMessages: true } } },
		where: { id: channel.id },
	});
	assert.equal(after._count.archivedMessages, 0); // eslint-disable-line no-underscore-dangle
	assert.deepEqual(after.lastMessageAt, before.lastMessageAt);
});

test('kept channels: staff can reopen, which gives the creator access back', async () => {
	const {
		channel, client, creator, staff,
	} = await openTicket({ keepClosedFor: 0 });
	await closeNow(client, channel, staff.id, 'fixed');

	// the creator isn't staff
	const denied = makeInteraction({
		channel,
		member: creator,
	});
	await runComponent(ReopenButton, client, {}, denied);
	assert.match(embedText(denied.responses[0].data), /staff/i);
	assert.equal((await client.prisma.ticket.findUnique({ where: { id: channel.id } })).open, false);

	const message = channel.messages.cache.last();
	const interaction = makeInteraction({
		channel,
		member: staff,
		message,
	});
	await runComponent(ReopenButton, client, {}, interaction);
	const ticket = await client.prisma.ticket.findUnique({ where: { id: channel.id } });
	assert.equal(ticket.open, true);
	assert.equal(ticket.closedAt, null);
	assert.equal(ticket.closedById, null);
	assert.equal(ticket.closedReason, null);
	assert.equal(canView(channel, creator.id), true);
	assert.match(embedText(interaction.responses.at(-1).data), /reopened/i);

	// reopening an open ticket is refused
	const again = makeInteraction({
		channel,
		member: staff,
	});
	await runComponent(ReopenButton, client, {}, again);
	assert.match(embedText(again.responses[0].data), /isn't closed/i);

	// and it can be closed again
	await closeNow(client, channel, staff.id);
	assert.equal((await client.prisma.ticket.findUnique({ where: { id: channel.id } })).open, false);
	assert.equal(canView(channel, creator.id), false);
});

test('kept channels: members added with /add are locked out too, claimed staff are not', async () => {
	const {
		channel, client, guild, staff,
	} = await openTicket({
		claiming: true,
		keepClosedFor: 0,
	});
	const helper = makeMember(guild);
	await channel.permissionOverwrites.edit(helper, { ViewChannel: true });
	await client.tickets.claim(makeInteraction({
		channel,
		member: staff,
		type: 'command',
	}));
	await closeNow(client, channel, staff.id);
	assert.equal(canView(channel, helper.id), false);
	assert.equal(canView(channel, staff.id), true);
});

test('kept channels: staff can delete the channel; the ticket stays in the database', async () => {
	const {
		channel, client, creator, staff,
	} = await openTicket({ keepClosedFor: 0 });
	await closeNow(client, channel, staff.id);

	const denied = makeInteraction({
		channel,
		member: creator,
	});
	await runComponent(DeleteButton, client, {}, denied);
	assert.equal(channel.deleted, false);

	await runComponent(DeleteButton, client, {}, makeInteraction({
		channel,
		member: staff,
	}));
	assert.equal(channel.deleted, true);
	assert.ok(await client.prisma.ticket.findUnique({ where: { id: channel.id } }));
});

test('kept channels: channels are deleted when their time is up, even after a restart', async () => {
	const {
		channel, client, staff,
	} = await openTicket({ keepClosedFor: 60 * 60 * 1000 });
	await closeNow(client, channel, staff.id);
	let ticket = await client.prisma.ticket.findUnique({ where: { id: channel.id } });
	const expected = ticket.closedAt.getTime() + (60 * 60 * 1000);
	assert.ok(Math.abs(ticket.channelDeleteAt.getTime() - expected) < 1000);
	assert.match(embedText(channel.sent.at(-1)), /deleted <t:\d+:R>/);

	assert.equal(await deleteExpiredChannels(client), 0, 'not yet');
	assert.equal(channel.deleted, false);

	await client.prisma.ticket.update({
		data: { channelDeleteAt: new Date(Date.now() - 1000) },
		where: { id: channel.id },
	});
	assert.equal(await deleteExpiredChannels(client), 1);
	assert.equal(channel.deleted, true);
	ticket = await client.prisma.ticket.findUnique({ where: { id: channel.id } });
	assert.equal(ticket.channelDeleteAt, null, 'not tried again');
});

test('kept channels: the sweep never deletes a channel in another server', async () => {
	const {
		channel, client, staff,
	} = await openTicket({ keepClosedFor: 1000 });
	await closeNow(client, channel, staff.id);
	await client.prisma.ticket.update({
		data: { channelDeleteAt: new Date(Date.now() - 1000) },
		where: { id: channel.id },
	});
	channel.guildId = makeGuild(client).id; // e.g. an imported ticket whose ID matches a channel elsewhere
	assert.equal(await deleteExpiredChannels(client), 0);
	assert.equal(channel.deleted, false);
});

test('transcript files are posted to the transcript channel and attached to the DM', async () => {
	const { client } = ctx;
	const guild = makeGuild(client);
	const transcripts = makeTextChannel(guild);
	const otherGuildChannel = makeTextChannel(makeGuild(client));
	const rendered = [];
	client.commands = {
		commands: {
			slash: new Map([['transcript', {
				fillTemplate: async (ticket, options) => {
					rendered.push(options);
					return {
						fileName: `ticket-${ticket.number}.html`,
						transcript: '<html></html>',
					};
				},
			}]]),
		},
	};
	try {
		const staffRole = makeRole(guild);
		const { category } = await seedCategory(client, guild, {
			anonymous: true,
			settings: {
				transcriptChannel: transcripts.id,
				transcriptDm: true,
			},
			staffRoles: [staffRole.id],
		});
		const creator = makeMember(guild);
		const dms = [];
		creator.send = async payload => dms.push(payload);
		const staff = makeMember(guild, { roles: [staffRole.id] });
		await client.tickets.create({
			categoryId: category.id,
			interaction: makeInteraction({ member: creator }),
		});
		const [channel] = guild.created;
		await closeNow(client, channel, staff.id);

		assert.equal(transcripts.sent.length, 1);
		assert.equal(transcripts.sent[0].files.length, 1);
		assert.doesNotMatch(transcripts.sent[0].content, new RegExp(staff.id), 'anonymous: the closer is "Staff"');
		assert.deepEqual(transcripts.sent[0].allowedMentions, { parse: [] });
		assert.equal(dms[0].files.length, 1);
		assert.deepEqual(rendered[0], { anonymise: true });

		// a transcript channel in another server (e.g. from an import) is never used
		await client.prisma.guild.update({
			data: { transcriptChannel: otherGuildChannel.id },
			where: { id: guild.id },
		});
		await client.tickets.create({
			categoryId: category.id,
			interaction: makeInteraction({ member: makeMember(guild) }),
		});
		await closeNow(client, guild.created[1], staff.id);
		assert.equal(otherGuildChannel.sent.length, 0);
	} finally {
		delete client.commands;
	}
});

test('no transcript files are made when archiving is off', async () => {
	const { client } = ctx;
	const guild = makeGuild(client);
	const transcripts = makeTextChannel(guild);
	const { category } = await seedCategory(client, guild, {
		archive: false,
		settings: { transcriptChannel: transcripts.id },
	});
	await client.tickets.create({
		categoryId: category.id,
		interaction: makeInteraction({ member: makeMember(guild) }),
	});
	await closeNow(client, guild.created[0], null);
	assert.equal(transcripts.sent.length, 0);
});

const claim = (client, channel, member) => {
	const interaction = makeInteraction({
		channel,
		member,
		type: 'command',
	});
	return client.tickets.claim(interaction).then(() => interaction);
};
const release = (client, channel, member) => {
	const interaction = makeInteraction({
		channel,
		member,
		type: 'command',
	});
	return client.tickets.release(interaction).then(() => interaction);
};

test('claiming: hides the ticket from other staff by default, or not when claimHide is off', async () => {
	let t = await openTicket({ claiming: true });
	await claim(t.client, t.channel, t.staff);
	assert.equal(canView(t.channel, t.staffRole.id), false);

	t = await openTicket({
		claimHide: false,
		claiming: true,
	});
	await claim(t.client, t.channel, t.staff);
	assert.equal(canView(t.channel, t.staffRole.id), true);
	assert.equal((await t.client.prisma.ticket.findUnique({ where: { id: t.channel.id } })).claimedById, t.staff.id);
});

test('claiming: a claimed ticket can only be taken over when the category allows it', async () => {
	let t = await openTicket({
		claimHide: false,
		claiming: true,
	});
	const other = makeMember(t.guild, { roles: [t.staffRole.id] });
	await claim(t.client, t.channel, t.staff);
	const refused = await claim(t.client, t.channel, other);
	assert.match(embedText(refused.responses[0].data), /already claimed/i);
	assert.equal((await t.client.prisma.ticket.findUnique({ where: { id: t.channel.id } })).claimedById, t.staff.id);

	t = await openTicket({
		claimHide: false,
		claimTakeover: true,
		claiming: true,
	});
	const next = makeMember(t.guild, { roles: [t.staffRole.id] });
	await claim(t.client, t.channel, t.staff);
	await claim(t.client, t.channel, next);
	assert.equal((await t.client.prisma.ticket.findUnique({ where: { id: t.channel.id } })).claimedById, next.id);
	assert.equal(t.channel.permissionOverwrites.cache.has(t.staff.id), false, 'the previous claimer loses their claim');
});

test('claiming: releasing removes the claimer\'s access, not the access of whoever released it', async () => {
	const t = await openTicket({
		claimHide: false,
		claiming: true,
	});
	const other = makeMember(t.guild, { roles: [t.staffRole.id] });
	await claim(t.client, t.channel, t.staff);
	await release(t.client, t.channel, other);
	assert.equal(t.channel.permissionOverwrites.cache.has(t.staff.id), false);
	assert.equal((await t.client.prisma.ticket.findUnique({ where: { id: t.channel.id } })).claimedById, null);
});

test('claiming: with claimReleaseLocked, only the claimer or a server manager can release', async () => {
	const t = await openTicket({
		claimHide: false,
		claimReleaseLocked: true,
		claiming: true,
	});
	const other = makeMember(t.guild, { roles: [t.staffRole.id] });
	await claim(t.client, t.channel, t.staff);
	const refused = await release(t.client, t.channel, other);
	assert.match(embedText(refused.responses[0].data), /only/i);
	assert.equal((await t.client.prisma.ticket.findUnique({ where: { id: t.channel.id } })).claimedById, t.staff.id);

	const manager = makeMember(t.guild, { admin: true });
	await release(t.client, t.channel, manager);
	assert.equal((await t.client.prisma.ticket.findUnique({ where: { id: t.channel.id } })).claimedById, null);
});

test('claiming: the channel can be renamed and moved while claimed, and put back when released', async () => {
	const { client } = ctx;
	const guild = makeGuild(client);
	const claimedCategory = makeCategoryChannel(guild);
	const staffRole = makeRole(guild);
	const { discordCategory } = await seedCategory(client, guild, {
		claimedCategory: claimedCategory.id,
		claimedChannelName: 'claimed-{claimer}-{num}',
		claiming: true,
		staffRoles: [staffRole.id],
	}).then(async seeded => {
		await client.tickets.create({
			categoryId: seeded.category.id,
			interaction: makeInteraction({ member: makeMember(guild) }),
		});
		return seeded;
	});
	const [channel] = guild.created;
	const original = channel.name;
	const staff = makeMember(guild, { roles: [staffRole.id] });
	await claim(client, channel, staff);
	assert.equal(channel.name, `claimed-${staff.user.username}-1`);
	assert.equal(channel.parentId, claimedCategory.id);
	await release(client, channel, staff);
	assert.equal(channel.name, original);
	assert.equal(channel.parentId, discordCategory.id);
});

test('claiming: anonymous tickets never put the claimer\'s name in the channel name', async () => {
	const t = await openTicket({
		anonymous: true,
		claimedChannelName: '{claimer}-{num}',
		claiming: true,
	});
	await claim(t.client, t.channel, t.staff);
	assert.equal(t.channel.name, 'staff-1');
});

test('claiming: a claimed category in another server is ignored', async () => {
	const { client } = ctx;
	const foreign = makeCategoryChannel(makeGuild(client));
	const t = await openTicket({
		claimedCategory: foreign.id,
		claiming: true,
	});
	const before = t.channel.parentId;
	await claim(t.client, t.channel, t.staff);
	assert.equal(t.channel.parentId, before);
});

test('log channel: excluded events are not posted, but others still are', async () => {
	const { client } = ctx;
	const guild = makeGuild(client);
	const log = makeTextChannel(guild);
	const t = await (async () => {
		const staffRole = makeRole(guild);
		const { category } = await seedCategory(client, guild, {
			claiming: true,
			settings: {
				logChannel: log.id,
				logExclude: ['ticket.claim'],
			},
			staffRoles: [staffRole.id],
		});
		await client.tickets.create({
			categoryId: category.id,
			interaction: makeInteraction({ member: makeMember(guild) }),
		});
		return {
			channel: guild.created[0],
			staff: makeMember(guild, { roles: [staffRole.id] }),
		};
	})();
	await new Promise(resolve => setTimeout(resolve, 50)); // the create log is sent in the background
	const created = log.sent.length;
	assert.ok(created >= 1, 'ticket creation is logged');
	await claim(client, t.channel, t.staff);
	await new Promise(resolve => setTimeout(resolve, 50));
	assert.equal(log.sent.length, created, 'claims are not');
});

test('opening message styles: text sends plain text, off sends only the mentions, details and buttons', async () => {
	let t = await openTicket({
		openingMessage: 'Welcome {name}! Topic: {topic}',
		openingStyle: 'TEXT',
	}, { topic: '@everyone please help' });
	let opening = t.channel.sent[0];
	assert.equal(opening.embeds, undefined);
	assert.match(opening.content, /Welcome/);
	assert.ok(opening.content.includes(DETAILS_MARK));
	assert.match(opening.content, /@everyone please help/);
	assert.deepEqual(opening.allowedMentions.parse, [], '@everyone in the topic never pings');
	assert.ok(opening.allowedMentions.users.includes(t.creator.id));

	t = await openTicket({
		openingMessage: 'Welcome {name}!',
		openingStyle: 'OFF',
	}, { topic: 'my order' });
	opening = t.channel.sent[0];
	assert.equal(opening.embeds, undefined);
	assert.doesNotMatch(opening.content, /Welcome/);
	assert.match(opening.content, /my order/);
	await new Promise(resolve => setTimeout(resolve, 50)); // let the background create logs finish
});
