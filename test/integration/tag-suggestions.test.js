const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	seedCategory, useTestClient,
} = require('../helpers/client');
const {
	embedText, makeGuild, makeInteraction, makeMember,
} = require('../helpers/discord');

const ctx = useTestClient();

async function setup(seed = {}) {
	const { client } = ctx;
	const guild = makeGuild(client);
	const { category } = await seedCategory(client, guild, {
		suggestTags: true,
		...seed,
	});
	const refund = await client.prisma.tag.create({
		data: {
			content: 'Refunds take 5 days. {user}, check your email.',
			guildId: guild.id,
			name: 'refunds',
			regex: 'refund|money back',
		},
	});
	const shipping = await client.prisma.tag.create({
		data: {
			content: 'Shipping is free over £50.',
			guildId: guild.id,
			name: 'Shipping',
		},
	});
	const creator = makeMember(guild);
	const create = async (topic, clicks) => {
		const interaction = makeInteraction({
			clicks,
			member: creator,
		});
		await client.tickets.create({
			categoryId: category.id,
			interaction,
			topic,
		});
		return interaction;
	};
	return {
		client,
		create,
		creator,
		guild,
		refund,
		shipping,
	};
}

const suggestion = tag => ({
	action: 'suggestion',
	tag,
});

test('tag suggestions: matching tags are shown, and the creator can open the ticket anyway (upstream #440)', async () => {
	const {
		create, creator, guild, refund, shipping,
	} = await setup();
	const interaction = await create('I want my money back, the shipping was late', [suggestion(null)]);
	const shown = interaction.responses.find(r => r.kind === 'editReply').data;
	const fields = shown.embeds[0].data.fields;
	assert.deepEqual(fields.map(f => f.name), ['refunds', 'Shipping'], 'pattern matches first');
	assert.match(fields[0].value, new RegExp(`<@${creator.id}>`), 'placeholders are filled');
	const buttons = shown.components[0].components.map(c => c.data);
	assert.deepEqual(buttons.map(b => JSON.parse(b.custom_id).tag), [refund.id, shipping.id, null]);

	assert.equal(guild.created.length, 1, 'the ticket was created');
	assert.deepEqual(interaction.buttons[0].responses[0].data, { components: [] });
	assert.match(embedText(interaction.responses.at(-1).data), new RegExp(guild.created[0].toString()));
});

test('tag suggestions: "solved" counts for the tag and doesn\'t open a ticket', async () => {
	const {
		client, create, guild, refund,
	} = await setup();
	const interaction = await create('refund please', [suggestion(refund.id)]);
	assert.equal(guild.created.length, 0);
	assert.match(embedText(interaction.buttons[0].responses[0].data), /solved/i);
	const tag = await client.prisma.tag.findUnique({ where: { id: refund.id } });
	assert.equal(tag.preventedCount, 1);
});

test('tag suggestions: no answer in time means no ticket', async () => {
	const {
		create, guild,
	} = await setup();
	const interaction = await create('refund please', []);
	assert.equal(guild.created.length, 0);
	assert.match(embedText(interaction.responses.at(-1).data), /expired/i);
});

test('tag suggestions: tickets are created straight away when nothing matches, or the category has them off', async () => {
	let {
		create, guild,
	} = await setup();
	await create('My account is locked', []);
	assert.equal(guild.created.length, 1);

	({
		create, guild,
	} = await setup({ suggestTags: false }));
	await create('refund please', []);
	assert.equal(guild.created.length, 1);
});

test('tag suggestions: question answers are matched too', async () => {
	const { client } = ctx;
	const guild = makeGuild(client);
	const { category } = await seedCategory(client, guild, {
		questions: {
			create: [{
				id: 'suggest-test-details',
				label: 'Details',
				order: 0,
			}],
		},
		suggestTags: true,
	});
	await client.prisma.tag.create({
		data: {
			content: 'Shipping is free.',
			guildId: guild.id,
			name: 'shipping',
		},
	});
	const interaction = makeInteraction({
		fields: { 'suggest-test-details': 'Where is my shipping update?' },
		member: makeMember(guild),
		type: 'modal',
	});
	await client.tickets.postQuestions({
		action: 'questions',
		categoryId: category.id,
		interaction,
	});
	assert.equal(guild.created.length, 0);
	assert.match(JSON.stringify(interaction.responses.find(r => r.kind === 'editReply').data.embeds[0].data), /Shipping is free/);
});
