const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	MessageFlags, MessageFlagsBitField,
} = require('discord.js');
const {
	IDS, buildButtons, buildOpeningMessage, editOpeningDetails, replaceById,
} = require('../../src/lib/tickets/opening-message');
const { buildPanel } = require('../../src/lib/panel');

const getMessage = key => key;
const base = {
	author: {
		avatar: 'https://cdn.example.com/avatar.png',
		name: 'Casey',
	},
	buttons: buildButtons({
		close: true,
		edit: true,
		getMessage,
	}),
	colour: '#009999',
	content: 'Hello <@1>',
	description: 'Staff will be with you soon.',
	fields: [{
		name: 'Topic',
		value: 'My order is missing',
	}],
	footer: { text: 'Example footer' },
	image: 'https://cdn.example.com/banner.png',
};

test('the embed style is unchanged', () => {
	const message = buildOpeningMessage({
		...base,
		v2: false,
	});
	assert.equal(message.content, 'Hello <@1>');
	assert.equal(message.embeds.length, 2);
	assert.equal(message.embeds[0].data.description, 'Staff will be with you soon.');
	assert.equal(message.embeds[1].data.fields[0].value, 'My order is missing');
	assert.equal(message.embeds[1].data.footer.text, 'Example footer');
	assert.equal(message.flags, undefined);
});

test('the V2 style puts everything in one container', () => {
	const message = buildOpeningMessage({
		...base,
		v2: true,
	});
	assert.equal(message.flags, MessageFlags.IsComponentsV2);
	assert.equal(message.content, undefined);
	assert.equal(message.embeds, undefined);
	const [mentions, container] = message.components.map(c => c.toJSON());
	assert.equal(mentions.content, 'Hello <@1>');
	assert.equal(container.accent_color, 0x009999);
	const json = JSON.stringify(container);
	for (const text of ['Casey', 'Staff will be with you soon.', 'banner.png', 'My order is missing', 'Example footer']) {
		assert.ok(json.includes(text), text);
	}
	assert.ok(container.components.some(c => c.id === IDS.details));
	assert.ok(container.components.some(c => c.id === IDS.buttons));
});

test('editing the details of a V2 opening message keeps everything else', async () => {
	const sent = buildOpeningMessage({
		...base,
		v2: true,
	});
	const message = {
		components: sent.components.map(c => c.toJSON()),
		edit: async data => Object.assign(message, data),
		flags: new MessageFlagsBitField(sent.flags),
	};
	assert.equal(await editOpeningDetails(message, [{
		name: 'Topic',
		value: 'Found it, thanks',
	}]), true);
	const json = JSON.stringify(message.components);
	assert.ok(json.includes('Found it, thanks'));
	assert.ok(!json.includes('My order is missing'));
	assert.ok(json.includes('Staff will be with you soon.'));
	assert.ok(json.includes('banner.png'));
});

test('editing the details of an embed opening message', async () => {
	const sent = buildOpeningMessage({
		...base,
		v2: false,
	});
	const message = {
		edit: async data => Object.assign(message, data),
		embeds: sent.embeds,
		flags: new MessageFlagsBitField(0),
	};
	assert.equal(await editOpeningDetails(message, [{
		name: 'Topic',
		value: 'Found it, thanks',
	}]), true);
	assert.equal(message.embeds[1].data.fields[0].value, 'Found it, thanks');
	assert.equal(message.embeds[1].data.footer.text, 'Example footer', 'the footer is kept');
});

test('replaceById finds nested components, and can remove them', () => {
	const tree = [{
		components: [{ id: 5 }, { id: 6 }],
		id: 1,
	}];
	const replaced = replaceById(tree, 6, {
		id: 6,
		x: true,
	});
	assert.deepEqual(replaced.components[0].components[1], {
		id: 6,
		x: true,
	});
	const removed = replaceById(tree, 5, null);
	assert.equal(removed.found, true);
	assert.deepEqual(removed.components[0].components, [{ id: 6 }]);
	assert.equal(replaceById(tree, 9, null).found, false);
});

test('panels in both styles', () => {
	const options = {
		colour: 'Blurple',
		description: 'Click below',
		title: 'Support',
	};
	const embed = buildPanel({
		...options,
		v2: false,
	});
	assert.equal(embed.embeds[0].data.title, 'Support');
	assert.deepEqual(embed.components, []);

	const v2 = buildPanel({
		...options,
		editing: true,
		v2: true,
	});
	assert.equal(v2.flags, MessageFlags.IsComponentsV2);
	assert.deepEqual(v2.embeds, [], 'old embeds are removed when an embed panel is changed');
	assert.equal(v2.content, null);
	assert.match(JSON.stringify(v2.components[0].toJSON()), /## Support\\nClick below/);
});

test('V2 opening messages stay within Discord\'s 4000 character text limit', () => {
	const long = 'x'.repeat(5000);
	const message = buildOpeningMessage({
		...base,
		content: long,
		description: long,
		fields: Array.from({ length: 5 }, (_, i) => ({
			name: `Question ${i}`,
			value: long,
		})),
		footer: { text: long },
		v2: true,
	});
	let total = 0;
	const walk = list => list.forEach(c => {
		if (c.type === 10) total += c.content.length;
		if (c.components) walk(c.components);
		if (c.accessory?.components) walk(c.accessory.components);
	});
	walk(message.components.map(c => c.toJSON()));
	assert.ok(total <= 4000, `${total} characters`);
});
