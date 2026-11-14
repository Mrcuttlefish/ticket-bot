// Aidan's decisions on the review's open items: dashboard roles are for settings only, button role limits cover
// every way of doing the same thing, imports are checked before anything is replaced, and the portal's live
// stream checks access again and allows one stream per user
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const {
	seedCategory, useTestClient,
} = require('../helpers/client');
const {
	embedText, makeCategoryChannel, makeGuild, makeInteraction, makeMember, makeRole, makeTextChannel, makeUser, runComponent,
} = require('../helpers/discord');
const { createTestAPI } = require('../helpers/api');
const ClaimSlashCommand = require('../../src/commands/slash/claim');
const CloseSlashCommand = require('../../src/commands/slash/close');
const ReleaseSlashCommand = require('../../src/commands/slash/release');
const TopicSlashCommand = require('../../src/commands/slash/topic');
const TranscriptSlashCommand = require('../../src/commands/slash/transcript');

const ctx = useTestClient();
let api;
const getAPI = async () => (api ??= await createTestAPI(ctx.client));
process.env.HTTP_EXTERNAL ??= 'https://tickets.example.com';

const DENIED = /aren't allowed to do this/;

async function setup(seed = {}, settings = {}) {
	const { client } = ctx;
	const guild = makeGuild(client);
	const staffRole = makeRole(guild, { name: 'staff' });
	const { category } = await seedCategory(client, guild, {
		claiming: true,
		memberLimit: 10,
		settings,
		staffRoles: [staffRole.id],
		...seed,
	});
	const creator = makeMember(guild);
	const staff = makeMember(guild, { roles: [staffRole.id] });
	const open = async (member = creator) => {
		await client.keyv.clear();
		const before = new Set(guild.created);
		await client.tickets.create({
			categoryId: category.id,
			interaction: makeInteraction({ member }),
			topic: 'Help please',
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
		staff,
		staffRole,
	};
}

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

const limit = (client, guild, buttons) => client.prisma.guild.update({
	data: { buttons },
	where: { id: guild.id },
});

test('dashboard roles: settings only, no tickets, statistics or staff roles', async () => {
	const { as } = await getAPI();
	const {
		category, client, guild, open, staffRole,
	} = await setup();
	await open();
	const dashboardRole = makeRole(guild, { name: 'dashboard' });
	const otherRole = makeRole(guild, { name: 'other' });
	await client.prisma.guild.update({
		data: { dashboardRoles: [dashboardRole.id] },
		where: { id: guild.id },
	});
	const helper = makeMember(guild, { roles: [dashboardRole.id] });
	const admin = makeMember(guild, { admin: true });
	const base = `/api/admin/guilds/${guild.id}`;
	client.users ??= { fetch: async id => guild.members.cache.get(id).user };
	const ticketId = (await client.prisma.ticket.findFirst({ where: { guildId: guild.id } })).id;

	// settings still work
	assert.equal((await as(helper.id)('GET', `${base}/settings`)).status, 200);
	assert.equal((await as(helper.id)('PATCH', `${base}/settings`, { footer: 'Thanks' })).status, 200);
	assert.equal((await as(helper.id)('GET', `${base}/categories`)).status, 200);
	assert.equal((await as(helper.id)('GET', `${base}/history`)).status, 200);
	assert.equal((await as(helper.id)('GET', base)).body.viaDashboardRole, true);

	// tickets and statistics don't
	assert.equal((await as(helper.id)('GET', `${base}/tickets`)).status, 403, 'no reading every ticket');
	assert.equal((await as(helper.id)('GET', `${base}/tickets/${ticketId}`)).status, 403, 'no reading transcripts');
	assert.equal((await as(helper.id)('GET', `${base}/statistics`)).status, 403);
	assert.equal((await as(admin.id)('GET', `${base}/tickets`)).status, 200, 'Manage Server still can');
	assert.equal((await as(admin.id)('GET', `${base}/tickets/${ticketId}`)).status, 200);
	assert.equal((await as(admin.id)('GET', `${base}/statistics`)).status, 200);

	// staff roles decide who reads tickets, so they can't be chosen with a dashboard role
	const url = `${base}/categories/${category.id}`;
	let res = await as(helper.id)('PATCH', url, { staffRoles: [staffRole.id, dashboardRole.id] });
	assert.equal(res.status, 403, res.text);
	res = await as(helper.id)('PATCH', url, { staffRoles: [] });
	assert.equal(res.status, 403, 'removing staff roles is a change too');
	res = await as(helper.id)('PATCH', url, {
		description: 'Changed',
		staffRoles: [staffRole.id],
	});
	assert.equal(res.status, 200, 'saving the same staff roles is fine');
	assert.deepEqual((await client.prisma.category.findUnique({ where: { id: category.id } })).staffRoles, [staffRole.id]);
	res = await as(helper.id)('POST', `${base}/categories`, {
		description: 'New',
		emoji: '🎫',
		name: 'New',
		staffRoles: [otherRole.id],
	});
	assert.equal(res.status, 403, `no creating a category with staff roles: ${res.text}`);
	res = await as(helper.id)('POST', `${base}/categories`, {
		description: 'New',
		emoji: '🎫',
		name: 'New',
		openingMessage: 'Hello',
		staffRoles: [],
	});
	assert.equal(res.status, 200, res.text);
	const created = res.body.id;
	res = await as(admin.id)('PATCH', url, { staffRoles: [staffRole.id, otherRole.id] });
	assert.equal(res.status, 200, 'Manage Server can change staff roles');

	// deleting a category with tickets deletes the tickets, like resetting the server
	assert.equal((await as(helper.id)('DELETE', url)).status, 403);
	assert.ok(await client.prisma.category.findUnique({ where: { id: category.id } }));
	assert.equal((await as(helper.id)('DELETE', `${base}/categories/${created}`)).status, 200, 'an empty one is fine');
});

test('button role limits: /claim, /release, /close, /topic and /transcript follow them too', async () => {
	const {
		client, creator, guild, open, staff, staffRole,
	} = await setup();
	const traineeRole = makeRole(guild, { name: 'trainee' });
	const trainee = makeMember(guild, { roles: [staffRole.id, traineeRole.id] });
	const channel = await open();
	await limit(client, guild, {
		claim: { deny: [traineeRole.id] },
		close: { deny: [traineeRole.id] },
		edit: { deny: [traineeRole.id] },
		transcript: { deny: [traineeRole.id] },
		unclaim: { deny: [traineeRole.id] },
	});

	let interaction = await command(client, ClaimSlashCommand, trainee, channel);
	assert.match(embedText(interaction.responses[0].data), DENIED);
	assert.equal((await client.prisma.ticket.findUnique({ where: { id: channel.id } })).claimedById, null);
	interaction = await command(client, ClaimSlashCommand, staff, channel);
	assert.doesNotMatch(embedText(interaction.responses.at(-1)?.data), DENIED);
	assert.equal((await client.prisma.ticket.findUnique({ where: { id: channel.id } })).claimedById, staff.id);

	interaction = await command(client, ReleaseSlashCommand, trainee, channel);
	assert.match(embedText(interaction.responses[0].data), DENIED);
	interaction = await command(client, CloseSlashCommand, trainee, channel);
	assert.match(embedText(interaction.responses[0].data), DENIED);
	assert.equal((await client.prisma.ticket.findUnique({ where: { id: channel.id } })).open, true);
	interaction = await command(client, TopicSlashCommand, trainee, channel);
	assert.match(embedText(interaction.responses[0].data), DENIED);
	interaction = await command(client, TranscriptSlashCommand, trainee, channel, { ticket: channel.id });
	assert.match(embedText(interaction.responses.at(-1).data), DENIED, 'after the reply was deferred');

	interaction = await command(client, CloseSlashCommand, creator, channel);
	assert.doesNotMatch(embedText(interaction.responses[0]?.data), DENIED, 'roles that aren\'t denied still can');
});

test('button role limits: the create button\'s limits cover every way of opening a ticket', async () => {
	const {
		category, client, creator, guild,
	} = await setup();
	const memberRole = makeRole(guild, { name: 'verified' });
	await limit(client, guild, { create: { allow: [memberRole.id] } });
	const interaction = makeInteraction({ member: creator });
	await client.tickets.create({
		categoryId: category.id,
		interaction,
		topic: 'Help',
	});
	assert.match(embedText(interaction.responses[0].data), DENIED);
	assert.equal(await client.prisma.ticket.count({ where: { guildId: guild.id } }), 0);

	creator.roles.cache.set(memberRole.id, memberRole);
	await client.keyv.clear();
	await client.tickets.create({
		categoryId: category.id,
		interaction: makeInteraction({ member: creator }),
		topic: 'Help',
	});
	await client.tickets.settle();
	assert.equal(await client.prisma.ticket.count({ where: { guildId: guild.id } }), 1);
});

test('button role limits: the portal\'s close button follows the close button\'s limits', async () => {
	const { as } = await getAPI();
	const {
		client, creator, guild, open,
	} = await setup();
	const channel = await open();
	const mutedRole = makeRole(guild, { name: 'muted' });
	creator.roles.cache.set(mutedRole.id, mutedRole);
	await limit(client, guild, { close: { deny: [mutedRole.id] } });
	const url = `/api/guilds/${guild.id}/tickets/${channel.id}`;
	let res = await as(creator.id)('GET', url);
	assert.equal(res.status, 200, res.text);
	assert.equal(res.body.permissions.canClose, false, 'the portal hides the close button');
	assert.equal(res.body.permissions.canReply, true);
	const close = () => api.app.inject({
		headers: {
			'authorization': `Bearer ${api.app.jwt.sign({
				createdAt: Date.now(),
				expiresAt: Date.now() + 60e3,
				id: creator.id,
			})}`,
			'content-type': 'application/json',
			'origin': new URL(process.env.HTTP_EXTERNAL).origin,
		},
		method: 'POST',
		payload: {},
		url: `${url}/close`,
	});
	res = await close();
	assert.equal(res.statusCode, 403, res.body);
	assert.equal((await client.prisma.ticket.findUnique({ where: { id: channel.id } })).open, true);

	creator.roles.cache.delete(mutedRole.id);
	res = await as(creator.id)('GET', url);
	assert.equal(res.body.permissions.canClose, true);
	res = await close();
	assert.equal(res.statusCode, 200, res.body);
});

/** A minimal zip with settings.json and tickets.jsonl (stored, not compressed) */
function zip(files) {
	const crcTable = Array.from({ length: 256 }, (_, n) => {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		return c >>> 0;
	});
	const crc32 = buffer => {
		let crc = 0xffffffff;
		for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
		return (crc ^ 0xffffffff) >>> 0;
	};
	const locals = [];
	const centrals = [];
	let offset = 0;
	for (const [name, content] of Object.entries(files)) {
		const data = Buffer.from(content);
		const nameBuffer = Buffer.from(name);
		const crc = crc32(data);
		const local = Buffer.alloc(30);
		local.writeUInt32LE(0x04034b50, 0);
		local.writeUInt16LE(20, 4);
		local.writeUInt32LE(crc, 14);
		local.writeUInt32LE(data.length, 18);
		local.writeUInt32LE(data.length, 22);
		local.writeUInt16LE(nameBuffer.length, 26);
		locals.push(local, nameBuffer, data);
		const central = Buffer.alloc(46);
		central.writeUInt32LE(0x02014b50, 0);
		central.writeUInt16LE(20, 4);
		central.writeUInt16LE(20, 6);
		central.writeUInt32LE(crc, 16);
		central.writeUInt32LE(data.length, 20);
		central.writeUInt32LE(data.length, 24);
		central.writeUInt16LE(nameBuffer.length, 28);
		central.writeUInt32LE(offset, 42);
		centrals.push(central, nameBuffer);
		offset += local.length + nameBuffer.length + data.length;
	}
	const centralSize = centrals.reduce((n, b) => n + b.length, 0);
	const end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0);
	end.writeUInt16LE(Object.keys(files).length, 8);
	end.writeUInt16LE(Object.keys(files).length, 10);
	end.writeUInt32LE(centralSize, 12);
	end.writeUInt32LE(offset, 16);
	return Buffer.concat([...locals, ...centrals, end]);
}

async function importFile(guild, owner, buffer) {
	const boundary = '----tickets' + Date.now();
	const body = Buffer.concat([
		Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="export.zip"\r\nContent-Type: application/zip\r\n\r\n`),
		buffer,
		Buffer.from(`\r\n--${boundary}--\r\n`),
	]);
	const res = await api.app.inject({
		headers: {
			'authorization': `Bearer ${api.app.jwt.sign({
				createdAt: Date.now(),
				expiresAt: Date.now() + 60e3,
				id: owner.id,
				scopes: ['applications.commands.permissions.update'],
			})}`,
			'content-type': `multipart/form-data; boundary=${boundary}`,
		},
		method: 'POST',
		payload: body,
		url: `/api/admin/guilds/${guild.id}/import`,
	});
	return res.body;
}

const ticketLine = (id, number, extra = {}) => JSON.stringify({
	categoryId: 1,
	createdAt: new Date().toISOString(),
	createdById: '200000000000000001',
	id,
	number,
	open: false,
	openingMessageId: '300000000000000001',
	...extra,
});

test('import: a bad file changes nothing, and channels from other servers aren\'t used', async () => {
	await getAPI();
	const { client } = ctx;
	const owner = makeUser();
	const guild = makeGuild(client, { ownerId: owner.id });
	makeMember(guild, { user: owner });
	const before = await setup();
	// the server already has data, which must survive a failed import
	const { category } = await seedCategory(client, guild, { name: 'Existing' });
	await client.prisma.tag.create({
		data: {
			content: 'Keep me',
			guild: { connect: { id: guild.id } },
			name: 'keep',
		},
	});
	const settings = (extra = {}) => JSON.stringify({
		categories: [{
			description: 'Imported',
			discordCategory: makeCategoryChannel(guild).id,
			emoji: '🎫',
			id: 1,
			name: 'Imported',
			openingMessage: 'Hello',
			staffRoles: [],
		}],
		tags: [{
			content: 'New',
			name: 'new',
		}],
		...extra,
	});
	const unchanged = async message => {
		const categories = await client.prisma.category.findMany({ where: { guildId: guild.id } });
		assert.deepEqual(categories.map(c => c.id), [category.id], message);
		assert.equal((await client.prisma.tag.findMany({ where: { guildId: guild.id } }))[0]?.name, 'keep', message);
	};

	// a broken ticket line used to fail after the old data had been deleted
	let body = await importFile(guild, owner, zip({
		'settings.json': settings(),
		'tickets.jsonl': [ticketLine('400000000000000001', 1), '{"id": "not a snowflake"}'].join('\n'),
	}));
	assert.match(body, /tickets\.jsonl line 2/);
	assert.match(body, /Nothing was changed/);
	await unchanged('a broken ticket');

	body = await importFile(guild, owner, zip({
		'settings.json': settings(),
		'tickets.jsonl': [ticketLine('400000000000000001', 1), ticketLine('400000000000000002', 1)].join('\n'),
	}));
	assert.match(body, /more than one ticket #1/);
	await unchanged('duplicate ticket numbers');

	body = await importFile(guild, owner, zip({
		'settings.json': settings({ categories: [{ id: 'x' }] }),
		'tickets.jsonl': '',
	}));
	assert.match(body, /no valid ID/);
	await unchanged('a category without an ID');

	body = await importFile(guild, owner, zip({
		'settings.json': '{ not json',
		'tickets.jsonl': '',
	}));
	assert.match(body, /not valid JSON/);
	await unchanged('broken settings.json');

	// a file that fails inside the transaction is rolled back too: this message's author isn't in the ticket
	body = await importFile(guild, owner, zip({
		'settings.json': settings(),
		'tickets.jsonl': ticketLine('400000000000000001', 1, {
			archivedMessages: [{
				authorId: '200000000000000009',
				content: 'orphan',
				createdAt: new Date().toISOString(),
				id: '500000000000000001',
			}],
		}),
	}));
	assert.match(body, /rolled back/, body);
	await unchanged('a failure while writing');
	assert.equal(await client.prisma.ticket.count({ where: { id: '400000000000000001' } }), 0);

	// a ticket that references a ticket outside the import loses the reference
	const otherTicket = await before.open();
	body = await importFile(guild, owner, zip({
		'settings.json': settings(),
		'tickets.jsonl': ticketLine('400000000000000001', 1, { referencesTicketId: otherTicket.id }),
	}));
	assert.match(body, /All data has been imported/, body);
	assert.equal((await client.prisma.ticket.findUnique({ where: { id: '400000000000000001' } })).referencesTicketId, null);

	// channels from another server are dropped (with a warning), never used
	const otherGuild = makeGuild(client);
	const foreignLog = makeTextChannel(otherGuild, { name: 'their-logs' });
	const foreignCategory = makeCategoryChannel(otherGuild);
	const localLog = makeTextChannel(guild, { name: 'logs' });
	const localOpen = makeTextChannel(guild, { name: 'ticket-2' });
	const foreignOpen = makeTextChannel(otherGuild, { name: 'private' });
	body = await importFile(guild, owner, zip({
		'settings.json': settings({
			categories: [{
				claimedCategory: foreignCategory.id,
				description: 'Imported',
				discordCategory: foreignCategory.id,
				emoji: '🎫',
				id: 7,
				name: 'Moved',
				openingMessage: 'Hello',
				staffRoles: [before.staffRole.id],
			}],
			logChannel: foreignLog.id,
			transcriptChannel: localLog.id,
		}),
		'tickets.jsonl': [
			ticketLine(localOpen.id, 2, {
				categoryId: 7,
				open: true,
			}),
			ticketLine(foreignOpen.id, 3, {
				categoryId: 7,
				open: true,
			}),
		].join('\n'),
	}));
	assert.match(body, /All data has been imported/, body);
	assert.match(body, /log channel isn&#39;t in this server/);
	assert.match(body, /a new one will be created/);
	const imported = await client.prisma.guild.findUnique({
		include: {
			categories: true,
			tickets: true,
		},
		where: { id: guild.id },
	});
	assert.equal(imported.logChannel, null);
	assert.equal(imported.transcriptChannel, localLog.id);
	const [moved] = imported.categories;
	assert.equal(moved.name, 'Moved');
	assert.notEqual(moved.discordCategory, foreignCategory.id, 'a new Discord category in this server');
	assert.equal(guild.channels.cache.get(moved.discordCategory)?.guildId, guild.id);
	assert.equal(moved.claimedCategory, null);
	assert.deepEqual(moved.staffRoles, [], 'roles from another server are dropped');
	const byId = new Map(imported.tickets.map(t => [t.id, t]));
	assert.equal(byId.get(localOpen.id).open, true);
	assert.equal(byId.get(localOpen.id).categoryId, moved.id, 'tickets are moved to the new category IDs');
	assert.equal(byId.get(foreignOpen.id).open, false, 'an open ticket can\'t point at another server\'s channel');
});

test('portal live stream: one stream per user, and access is checked again', async () => {
	await getAPI();
	const {
		client, guild, open, staff, staffRole,
	} = await setup();
	// let the test client send member events like discord.js does
	if (!client.emit) {
		const emitter = new EventEmitter();
		client.on = emitter.on.bind(emitter);
		client.emit = emitter.emit.bind(emitter);
		delete client.portalStreams;
	}
	const channel = await open();
	const address = await api.app.listen({
		host: '127.0.0.1',
		port: 0,
	});
	const token = api.app.jwt.sign({
		createdAt: Date.now(),
		expiresAt: Date.now() + 60e3,
		id: staff.id,
	});
	const connect = async () => {
		const response = await fetch(`${address}/api/guilds/${guild.id}/tickets/${channel.id}/events`, { headers: { authorization: `Bearer ${token}` } });
		const reader = response.body.getReader();
		const stream = {
			text: '',
			async until(pattern) {
				while (!pattern.test(stream.text)) {
					const { value, done } = await reader.read(); // eslint-disable-line object-curly-newline
					if (done) return false;
					stream.text += Buffer.from(value).toString();
				}
				return true;
			},
		};
		await stream.until(/event: ready/);
		return stream;
	};
	try {
		const first = await connect();
		const second = await connect();
		assert.ok(await first.until(/event: replaced/), 'the old stream is told it was replaced');
		assert.equal(await first.until(/never/), false, 'and closed');
		assert.equal(client.portalStreams.size, 1);

		// losing the staff role ends the stream straight away
		staff.roles.cache.delete(staffRole.id);
		client.emit('guildMemberUpdate', staff, staff);
		assert.ok(await second.until(/event: access-revoked/));
		assert.equal(await second.until(/never/), false);
		assert.equal(client.portalStreams.size, 0);

		const res = await fetch(`${address}/api/guilds/${guild.id}/tickets/${channel.id}/events`, { headers: { authorization: `Bearer ${token}` } });
		assert.equal(res.status, 404, 'and it can\'t reconnect');
	} finally {
		await api.app.close();
		api = undefined;
	}
});
