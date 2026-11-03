const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	seedCategory, useTestClient,
} = require('../helpers/client');
const {
	embedText, makeCategoryChannel, makeGuild, makeInteraction, makeMember, makeRole,
} = require('../helpers/discord');

const ctx = useTestClient();

// a new guild and member for each test, so caches and counts don't leak between tests
async function setup(seed = {}, member = {}) {
	const { client } = ctx;
	const guild = makeGuild(client);
	const seeded = await seedCategory(client, guild, seed);
	const creator = makeMember(guild, member);
	return {
		client,
		creator,
		guild,
		...seeded,
	};
}

const create = async (client, creator, category, extra = {}) => {
	const interaction = makeInteraction({ member: creator });
	await client.tickets.create({
		categoryId: category.id,
		interaction,
		...extra,
	});
	return interaction;
};

test('creates a ticket channel, opening message and database row', async () => {
	const {
		client, creator, guild, category, discordCategory,
	} = await setup({ pingRoles: [] });
	const interaction = await create(client, creator, category, { topic: 'My order is missing' });

	assert.equal(guild.created.length, 1);
	const [channel] = guild.created;
	assert.equal(channel.name, 'ticket-1');
	assert.equal(channel.parentId, discordCategory.id);
	assert.ok(channel.permissionOverwrites.cache.has(creator.id));
	assert.equal(channel.topic, `${creator} | My order is missing`);
	assert.match(embedText(channel.sent[0]), new RegExp(`Hello ${creator}`));
	assert.ok(channel.messages.cache.find(m => m.pinned), 'the opening message is pinned');

	const ticket = await client.prisma.ticket.findUnique({ where: { id: channel.id } });
	assert.equal(ticket.number, 1);
	assert.equal(ticket.createdById, creator.id);
	assert.equal(ticket.openingMessageId, channel.sent.length && [...channel.messages.cache.values()][0].id);
	assert.notEqual(ticket.topic, 'My order is missing', 'the topic is encrypted');
	assert.ok(interaction.responses.some(r => r.kind === 'editReply' && embedText(r.data).includes(channel.toString())));
});

test('ticket numbers continue from the offset (upstream #416)', async () => {
	const {
		client, creator, guild, category,
	} = await setup({ settings: { ticketNumberOffset: 1000 } });
	await create(client, creator, category);
	assert.equal(guild.created[0].name, 'ticket-1001');
});

test('the member limit applies, and role limits override it (upstream #385)', async () => {
	const {
		client, guild, category,
	} = await setup({ memberLimit: 1 });
	const donator = makeRole(guild);
	await client.prisma.category.update({
		data: {
			roleLimits: [{
				limit: 2,
				role: donator.id,
			}],
		},
		where: { id: category.id },
	});
	await client.tickets.getCategory(category.id, true);

	const member = makeMember(guild);
	await create(client, member, category);
	await client.keyv.clear(); // rate limit
	const second = await create(client, member, category);
	assert.match(embedText(second.responses[0].data), /already have a ticket/i);
	assert.equal(guild.created.length, 1);

	const vip = makeMember(guild, { roles: [donator.id] });
	await create(client, vip, category);
	await client.keyv.clear();
	await create(client, vip, category);
	assert.equal(guild.created.length, 3);
});

test('blocked roles: the guild blocklist and the category\'s (upstream PR #495)', async () => {
	const {
		client, guild, category,
	} = await setup();
	const banned = makeRole(guild);
	const muted = makeRole(guild);
	await client.prisma.guild.update({
		data: { blocklist: [banned.id] },
		where: { id: guild.id },
	});
	await client.prisma.category.update({
		data: { blockedRoles: [muted.id] },
		where: { id: category.id },
	});
	await client.tickets.getCategory(category.id, true);

	for (const role of [banned, muted]) {
		const member = makeMember(guild, { roles: [role.id] });
		const interaction = await create(client, member, category);
		assert.match(embedText(interaction.responses[0].data), /blocked/i);
	}
	assert.equal(guild.created.length, 0);
});

test('timed out members can\'t create tickets', async () => {
	const {
		client, creator, category,
	} = await setup({}, { timedOut: true });
	const interaction = await create(client, creator, category);
	assert.match(embedText(interaction.responses[0].data), /blocked/i);
});

test('falls back to another Discord category when one is full (upstream #472)', async () => {
	const { client } = ctx;
	const guild = makeGuild(client);
	const full = makeCategoryChannel(guild, { children: 50 });
	const spare = makeCategoryChannel(guild);
	const { category } = await seedCategory(client, guild, {
		discordCategory: full,
		fallbackCategories: [spare.id],
	});
	const member = makeMember(guild);
	await create(client, member, category);
	assert.equal(guild.created[0].parentId, spare.id);

	// and errors when they're all full
	for (let i = 0; i < 50; i++) spare.children.cache.set(String(i), {});
	const other = makeMember(guild);
	const interaction = await create(client, other, category);
	assert.match(embedText(interaction.responses[0].data), /full/i);
});

test('pings roles depending on the creator\'s roles (upstream #386)', async () => {
	const {
		client, guild, category,
	} = await setup();
	const staff = makeRole(guild);
	const spanish = makeRole(guild);
	const spanishStaff = makeRole(guild);
	await client.prisma.category.update({
		data: {
			pingRoleRules: [{
				ping: [spanishStaff.id],
				roles: [spanish.id],
			}],
			pingRoles: [staff.id],
		},
		where: { id: category.id },
	});
	await client.tickets.getCategory(category.id, true);

	await create(client, makeMember(guild), category);
	await create(client, makeMember(guild, { roles: [spanish.id] }), category);
	const [first, second] = guild.created;
	assert.match(first.sent[0].content, new RegExp(staff.id));
	assert.match(second.sent[0].content, new RegExp(spanishStaff.id));
	assert.doesNotMatch(second.sent[0].content, new RegExp(staff.id));
});

test('categories with questions show a modal instead of creating a ticket', async () => {
	const {
		client, creator, guild, category,
	} = await setup({
		questions: {
			create: [{
				id: 'order',
				label: 'Order number',
				order: 0,
			}],
		},
	});
	const interaction = await create(client, creator, category);
	assert.equal(interaction.responses[0].kind, 'showModal');
	assert.equal(guild.created.length, 0);
});

test('unknown categories get an error', async () => {
	const { client } = ctx;
	const guild = makeGuild(client);
	await client.prisma.guild.create({ data: { id: guild.id } });
	const interaction = makeInteraction({ member: makeMember(guild) });
	await client.tickets.create({
		categoryId: 999999,
		interaction,
	});
	assert.match(embedText(interaction.responses[0].data), /category/i);
});

test('Components V2: the opening message uses layout components, and claiming swaps the button (upstream #655)', async () => {
	const { MessageFlags } = require('discord.js');
	const { client } = ctx;
	const guild = makeGuild(client);
	const staffRole = makeRole(guild);
	const { category } = await seedCategory(client, guild, {
		claiming: true,
		settings: {
			claimButton: true,
			componentsV2: true,
		},
		staffRoles: [staffRole.id],
	});
	const creator = makeMember(guild);
	await create(client, creator, category, { topic: 'My order is missing' });
	const [channel] = guild.created;
	const sent = channel.sent[0];
	assert.equal(sent.flags, MessageFlags.IsComponentsV2);
	assert.equal(sent.embeds, undefined, 'no embeds');
	assert.equal(sent.content, undefined, 'V2 messages can\'t have content');
	const json = JSON.stringify(sent.components.map(c => c.toJSON()));
	assert.match(json, new RegExp(`Hello ${creator}`));
	assert.match(json, /My order is missing/);
	assert.match(json, /\{\\"action\\":\\"claim\\"\}/);

	const staff = makeMember(guild, { roles: [staffRole.id] });
	const interaction = makeInteraction({
		channel,
		member: staff,
	});
	await client.tickets.claim(interaction);
	const opening = channel.messages.cache.get(channel.messages.cache.firstKey());
	const edited = JSON.stringify(opening.components);
	assert.match(edited, /\{\\"action\\":\\"unclaim\\"\}/, 'the claim button becomes release');
	assert.doesNotMatch(edited, /\{\\"action\\":\\"claim\\"\}/);
	assert.match(edited, /My order is missing/, 'the rest of the message is kept');
});

test('menu questions: a modal with a select menu, and the chosen options are saved and shown (upstream #446)', async () => {
	const { client } = ctx;
	const guild = makeGuild(client);
	const { category } = await seedCategory(client, guild, {
		questions: {
			create: [
				{
					id: 'menu-test-order',
					label: 'Order number',
					order: 0,
				},
				{
					id: 'menu-test-platform',
					label: 'Platform',
					maxLength: 2,
					minLength: 1,
					options: [{ label: 'Web' }, { label: 'iOS' }, { label: 'Android' }],
					order: 1,
					type: 'MENU',
				},
			],
		},
	});
	const creator = makeMember(guild);
	const shown = await create(client, creator, category);
	const modal = shown.responses[0].data.toJSON();
	assert.equal(modal.components.length, 2);
	assert.equal(modal.components[0].component.type, 4, 'a text input');
	const menu = modal.components[1].component;
	assert.equal(menu.type, 3, 'a select menu');
	assert.equal(modal.components[1].label, 'Platform');
	assert.deepEqual(menu.options.map(o => o.label), ['Web', 'iOS', 'Android']);
	assert.equal(menu.max_values, 2);

	const submit = makeInteraction({
		fields: {
			'menu-test-order': '12345',
			'menu-test-platform': ['0', '2'],
		},
		member: creator,
		type: 'modal',
	});
	await client.tickets.postQuestions({
		action: 'questions',
		categoryId: category.id,
		interaction: submit,
	});
	const [channel] = guild.created;
	const opening = JSON.stringify(channel.sent[0].embeds.map(e => e.data));
	assert.match(opening, /12345/);
	assert.match(opening, /Web\\nAndroid/);
	const answers = await client.prisma.questionAnswer.findMany({
		include: { question: true },
		where: { ticketId: channel.id },
	});
	assert.equal(answers.length, 2);
	const { decrypt } = require('../../src/lib/crypto');
	assert.equal(decrypt(answers.find(a => a.questionId === 'menu-test-platform').value), 'Web\nAndroid');
});
