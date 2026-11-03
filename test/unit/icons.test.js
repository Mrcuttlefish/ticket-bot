const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { join } = require('node:path');
const { Collection } = require('discord.js');
const {
	BUTTON_ICONS, buttonEmoji, getIconFiles, setIcons, syncIcons,
} = require('../../src/lib/icons');
const { buildButtons } = require('../../src/lib/tickets/opening-message');

const getMessage = key => ({
	'buttons.claim.emoji': '🙌',
	'buttons.close.emoji': '✖️',
}[key] ?? key);

test('every button has an icon, and emoji names are valid', () => {
	const files = getIconFiles();
	const icons = new Set(files.map(f => f.icon));
	for (const icon of Object.values(BUTTON_ICONS)) assert.ok(icons.has(icon), `src/icons/${icon}.png`);
	for (const { emojiName } of files) assert.match(emojiName, /^\w{2,32}$/);
	for (const { file } of files) {
		assert.ok(fs.statSync(file).size < 256 * 1024, 'Discord\'s limit');
		assert.ok(fs.existsSync(file.replace(/\.png$/, '.svg')), 'the source is kept');
	}
});

function fakeClient(names) {
	const created = [];
	const deleted = [];
	let next = 1;
	const make = name => ({
		delete: async () => deleted.push(name),
		id: String(next++),
		name,
	});
	return {
		application: {
			emojis: {
				create: async ({ name }) => {
					created.push(name);
					return make(name);
				},
				fetch: async () => new Collection(names.map(name => {
					const emoji = make(name);
					return [emoji.id, emoji];
				})),
			},
		},
		created,
		deleted,
		log: {
			info: () => {},
			warn: () => {},
		},
	};
}

test('syncIcons uploads missing icons, keeps current ones, and deletes old versions', async () => {
	const files = getIconFiles();
	const current = files.find(f => f.icon === 'close').emojiName;
	const client = fakeClient([current, 'dt_close_00000000', 'someone_elses_emoji']);
	const icons = await syncIcons(client);
	assert.equal(icons.size, files.length);
	assert.ok(!client.created.includes(current), 'not uploaded again');
	assert.equal(client.created.length, files.length - 1);
	assert.deepEqual(client.deleted, ['dt_close_00000000'], 'other emojis are left alone');

	// buttons use the icons now
	assert.deepEqual(buttonEmoji(getMessage, 'close'), icons.get('close'));
	const row = buildButtons({
		claim: 'claim',
		close: true,
		getMessage,
	}).toJSON();
	assert.equal(row.components[0].emoji.id, icons.get('claim').id);
	setIcons();
});

test('buttons use the locale\'s emojis without icons', () => {
	setIcons();
	assert.equal(buttonEmoji(getMessage, 'close'), '✖️');
});

test('a changed image gets a new emoji name', t => {
	const dir = fs.mkdtempSync(join(require('node:os').tmpdir(), 'icons-'));
	t.after(() => fs.rmSync(dir, { recursive: true }));
	fs.writeFileSync(join(dir, 'close.png'), 'one');
	const [before] = getIconFiles(dir);
	fs.writeFileSync(join(dir, 'close.png'), 'two');
	const [after] = getIconFiles(dir);
	assert.notEqual(before.emojiName, after.emojiName);
});
