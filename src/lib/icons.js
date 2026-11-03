/**
 * Custom icons (upstream #590): the bot's own button icons, uploaded as application emojis so they work in every
 * server without the bot needing emoji permissions. Turned on with `icons: true` in config.yml.
 *
 * The images are in src/icons (each .png is rendered from the .svg next to it). An emoji's name includes a hash of
 * its image, so changed icons are uploaded again and the old versions are deleted. Until the icons are synced, or if
 * syncing fails, buttons use the emoji from the locale (`buttons.<button>.emoji`).
 */

const { createHash } = require('node:crypto');
const fs = require('node:fs');
const { join } = require('node:path');

const DIRECTORY = join(__dirname, '../icons');
const PREFIX = 'dt_';

/** which icon each button uses */
const BUTTON_ICONS = Object.freeze({
	accept_close_request: 'check',
	cancel: 'minus',
	claim: 'claim',
	close: 'close',
	confirm_open: 'check',
	create: 'ticket',
	edit: 'edit',
	reject_close_request: 'close',
	transcript: 'transcript',
	unclaim: 'release',
});

/** @type {Map<string, { id: string, name: string }>} icon name -> application emoji */
let synced = new Map();

/**
 * The icons in src/icons, with the emoji name each one should be uploaded as.
 * @param {string} [directory]
 * @returns {{ icon: string, emojiName: string, file: string }[]}
 */
function getIconFiles(directory = DIRECTORY) {
	return fs.readdirSync(directory)
		.filter(file => file.endsWith('.png'))
		.map(file => {
			const icon = file.slice(0, -4);
			const hash = createHash('sha256').update(fs.readFileSync(join(directory, file))).digest('hex').slice(0, 8);
			return {
				emojiName: `${PREFIX}${icon}_${hash}`, // at most 32 characters
				file: join(directory, file),
				icon,
			};
		});
}

/**
 * Upload missing icons as application emojis and delete outdated ones.
 * @param {import('client')} client a ready client
 * @param {string} [directory]
 * @returns {Promise<Map<string, { id: string, name: string }>>}
 */
async function syncIcons(client, directory = DIRECTORY) {
	const files = getIconFiles(directory);
	const wanted = new Set(files.map(f => f.emojiName));
	const existing = await client.application.emojis.fetch();
	const icons = new Map();
	for (const {
		emojiName, file, icon,
	} of files) {
		let emoji = existing.find(e => e.name === emojiName);
		if (!emoji) {
			emoji = await client.application.emojis.create({
				attachment: file,
				name: emojiName,
			});
			client.log.info(`Uploaded the "${icon}" icon`);
		}
		icons.set(icon, {
			id: emoji.id,
			name: emoji.name,
		});
	}
	// only emojis that look like ours are deleted; other application emojis are left alone
	for (const emoji of existing.values()) {
		if (emoji.name.startsWith(PREFIX) && !wanted.has(emoji.name)) {
			await emoji.delete().catch(error => client.log.warn(`Failed to delete the old "${emoji.name}" icon`, error));
		}
	}
	synced = icons;
	return icons;
}

/**
 * The emoji for a button: the custom icon if there is one, otherwise the locale's emoji.
 * @param {(key: string) => string} getMessage
 * @param {keyof BUTTON_ICONS} button
 * @returns {string | { id: string, name: string }}
 */
function buttonEmoji(getMessage, button) {
	return synced.get(BUTTON_ICONS[button]) ?? getMessage(`buttons.${button}.emoji`);
}

/**
 * Replace the synced icons (for tests, or to turn them off)
 * @param {Map<string, { id: string, name: string }>} icons
 */
function setIcons(icons = new Map()) {
	synced = icons;
}

module.exports = {
	BUTTON_ICONS,
	buttonEmoji,
	getIconFiles,
	setIcons,
	syncIcons,
};
