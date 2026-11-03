/**
 * Builds a ticket's opening message, either as embeds (the default) or with Discord's layout components
 * ("Components V2", upstream #655) when the guild turns `componentsV2` on. Categories can instead use plain text
 * (`openingStyle: 'TEXT'`) or turn the opening message off (`'OFF'`: only the mentions, the topic or answers, and
 * the buttons are sent; the ticket still needs a message to hold the buttons).
 *
 * The opening message is edited later (claiming changes the buttons, editing the topic or answers changes the
 * details), so this module also handles those edits for both styles. In the V2 style, the parts that change are
 * found by their component `id`s rather than their position.
 */

const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	EmbedBuilder,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder,
	resolveColor,
} = require('discord.js');
const ExtendedEmbedBuilder = require('../embed');
const { buttonEmoji } = require('../icons');

// component IDs (any positive 32-bit integer that is unique in the message)
const IDS = {
	buttons: 300,
	details: 200,
};

// Discord allows 4000 characters of text across all of a V2 message's text displays, so each part gets a share.
// The details have a fixed share so they can be edited later without re-measuring the rest of the message.
const LIMITS = {
	content: 400,
	details: 1500,
	footer: 200,
	intro: 1800,
};

// Discord's limit for a message's content
const TEXT_LIMIT = 2000;

/**
 * A member's name as plain text in markdown. One pass escapes every character Discord's markdown uses, including
 * backslashes and link brackets (escapeMarkdown leaves brackets alone, and escaping them after it would let a
 * backslash in the name undo its escaping).
 * @param {string} name
 * @returns {string}
 */
const escapeName = name => String(name ?? '').replace(/[\\*_~`|>#\-[\]()<:]/g, '\\$&');
// in text opening messages, the topic or answers come after this line so they can be replaced when edited
const DETAILS_MARK = '\n\u200b\n';

const truncate = (text, max) => (text.length > max ? text.slice(0, max - 1) + '…' : text);

/**
 * @param {string} colour a colour the guild settings accept (a hex string or a name like "Blurple")
 * @returns {number|undefined}
 */
function toColour(colour) {
	try {
		return resolveColor(colour);
	} catch {
		return undefined;
	}
}

/**
 * @param {{ name: string, value: string }[]} fields
 * @returns {string}
 */
function fieldsToMarkdown(fields) {
	return truncate(fields.map(field => `**${field.name}**\n${field.value}`).join('\n\n'), LIMITS.details);
}

/**
 * The buttons under the opening message.
 * @param {object} options
 * @param {(key: string) => string} options.getMessage
 * @param {boolean} [options.edit]
 * @param {'claim'|'unclaim'|null} [options.claim]
 * @param {boolean} [options.close]
 * @returns {ActionRowBuilder|null} null if there are no buttons
 */
function buildButtons({
	getMessage,
	edit = false,
	claim = null,
	close = false,
}) {
	const row = new ActionRowBuilder();
	if (edit) {
		row.addComponents(
			new ButtonBuilder()
				.setCustomId(JSON.stringify({ action: 'edit' }))
				.setStyle(ButtonStyle.Secondary)
				.setEmoji(buttonEmoji(getMessage, 'edit'))
				.setLabel(getMessage('buttons.edit.text')),
		);
	}
	if (claim) {
		row.addComponents(
			new ButtonBuilder()
				.setCustomId(JSON.stringify({ action: claim }))
				.setStyle(ButtonStyle.Secondary)
				.setEmoji(buttonEmoji(getMessage, claim))
				.setLabel(getMessage(`buttons.${claim}.text`)),
		);
	}
	if (close) {
		row.addComponents(
			new ButtonBuilder()
				.setCustomId(JSON.stringify({ action: 'close' }))
				.setStyle(ButtonStyle.Danger)
				.setEmoji(buttonEmoji(getMessage, 'close'))
				.setLabel(getMessage('buttons.close.text')),
		);
	}
	return row.components.length ? row : null;
}

/**
 * @param {object} options
 * @param {'EMBED'|'TEXT'|'OFF'} [options.style] the category's opening message style; EMBED uses `v2`
 * @param {boolean} options.v2 use layout components instead of embeds
 * @param {string} options.colour
 * @param {string} options.content the text above the message (mentions the creator and staff)
 * @param {{ name: string, avatar: string }} options.author the ticket's creator
 * @param {string|null} options.description the category's opening message, with placeholders filled in
 * @param {string|null} [options.image]
 * @param {{ name: string, value: string }[]} [options.fields] the topic or question answers
 * @param {{ text: string, iconURL?: string|null }|null} [options.footer]
 * @param {ActionRowBuilder|null} [options.buttons]
 * @returns {import('discord.js').MessageCreateOptions}
 */
function buildOpeningMessage({
	style = 'EMBED',
	v2,
	colour,
	content,
	author,
	description,
	image = null,
	fields = [],
	footer = null,
	buttons = null,
}) {
	if (style === 'TEXT' || style === 'OFF') {
		const head = style === 'TEXT'
			? [content, `**${escapeName(author.name)}**`, description, image].filter(Boolean).join('\n\n')
			: content;
		return {
			// the text can include things members wrote (the topic and answers, or placeholders in the opening message),
			// so only the creator and roles mentioned in `content` are pinged, as with embeds
			allowedMentions: getAllowedMentions(content),
			components: buttons ? [buttons] : [],
			content: buildText(head, fields),
		};
	}

	if (!v2) {
		const embeds = [
			new ExtendedEmbedBuilder()
				.setColor(colour)
				.setAuthor({
					iconURL: author.avatar,
					name: author.name,
				})
				// an empty opening message is allowed (upstream #534); the embed keeps the creator and image
				.setDescription(description || null),
		];
		if (image) embeds[0].setImage(image);
		if (fields.length) {
			embeds.push(
				new ExtendedEmbedBuilder()
					.setColor(colour)
					.setFields(fields),
			);
		}
		if (footer) embeds[embeds.length - 1].setFooter(footer);
		return {
			components: buttons ? [buttons] : [],
			content,
			embeds,
		};
	}

	const container = new ContainerBuilder();
	const accent = toColour(colour);
	if (accent !== undefined) container.setAccentColor(accent);

	const intro = new TextDisplayBuilder().setContent(truncate(`### ${author.name}` + (description ? `\n${description}` : ''), LIMITS.intro));
	if (author.avatar) {
		container.addSectionComponents(
			new SectionBuilder()
				.addTextDisplayComponents(intro)
				.setThumbnailAccessory(new ThumbnailBuilder().setURL(author.avatar)),
		);
	} else {
		container.addTextDisplayComponents(intro);
	}
	if (image) {
		container.addMediaGalleryComponents(
			new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(image)),
		);
	}
	// always present (even if empty) so the topic or answers can be added when they're edited
	container.addSeparatorComponents(new SeparatorBuilder());
	container.addTextDisplayComponents(
		new TextDisplayBuilder()
			.setId(IDS.details)
			.setContent(fields.length ? fieldsToMarkdown(fields) : '-# —'),
	);
	if (buttons) container.addActionRowComponents(buttons.setId(IDS.buttons));
	if (footer?.text) container.addTextDisplayComponents(new TextDisplayBuilder().setContent(truncate(`-# ${footer.text}`, LIMITS.footer)));

	return {
		// V2 messages can't have `content`, so the mentions go in a text display above the container
		components: [new TextDisplayBuilder().setContent(truncate(content, LIMITS.content)), container],
		flags: MessageFlags.IsComponentsV2,
	};
}

/**
 * The users and roles mentioned in a trusted piece of text (the mentions line written by the bot).
 * @param {string} text
 * @returns {{ parse: [], roles: string[], users: string[] }}
 */
function getAllowedMentions(text) {
	return {
		parse: [],
		roles: [...new Set([...(text ?? '').matchAll(/<@&(\d{17,20})>/g)].map(m => m[1]))],
		users: [...new Set([...(text ?? '').matchAll(/<@!?(\d{17,20})>/g)].map(m => m[1]))],
	};
}

/**
 * A text opening message: the head, then the topic or answers after `DETAILS_MARK`, within Discord's limit.
 * @param {string} head
 * @param {{ name: string, value: string }[]} fields
 * @returns {string}
 */
function buildText(head, fields) {
	// members' text (the topic, answers, or placeholders in the head) can't add a second marker, which would make
	// later edits replace the wrong part of the message
	const clean = text => String(text ?? '').replaceAll('\u200b', '');
	const details = fields.length ? truncate(fields.map(field => `**${clean(field.name)}**\n${clean(field.value)}`).join('\n\n'), LIMITS.details) : '';
	return truncate(clean(head), TEXT_LIMIT - DETAILS_MARK.length - details.length) + DETAILS_MARK + details;
}

/**
 * @param {import('discord.js').Message} message
 * @returns {boolean}
 */
function isV2(message) {
	return Boolean(message.flags?.has?.(MessageFlags.IsComponentsV2));
}

/**
 * Replace the component with `id` in a V2 message's (JSON) component tree.
 * @param {object[]} components
 * @param {number} id
 * @param {object|null} replacement JSON, or null to remove it
 * @returns {{ components: object[], found: boolean }}
 */
function replaceById(components, id, replacement) {
	let found = false;
	const walk = list => list.flatMap(component => {
		if (component.id === id) {
			found = true;
			return replacement ? [replacement] : [];
		}
		if (Array.isArray(component.components)) {
			return [{
				...component,
				components: walk(component.components),
			}];
		}
		return [component];
	});
	return {
		components: walk(components),
		found,
	};
}

const toJSON = component => (typeof component.toJSON === 'function' ? component.toJSON() : component);

/**
 * Change the buttons on an opening message (e.g. "Claim" becomes "Release").
 * @param {import('discord.js').Message} message
 * @param {ActionRowBuilder|null} buttons
 */
async function editOpeningButtons(message, buttons) {
	if (!isV2(message)) return await message.edit({ components: buttons ? [buttons] : [] });
	const row = buttons ? buttons.setId(IDS.buttons).toJSON() : null;
	const { components } = replaceById(message.components.map(toJSON), IDS.buttons, row);
	return await message.edit({ components });
}

/**
 * Change the topic or answers shown on an opening message.
 * @param {import('discord.js').Message} message
 * @param {{ name: string, value: string }[]} fields
 * @returns {Promise<boolean>} false if the message doesn't have a details section to edit
 */
async function editOpeningDetails(message, fields) {
	if (!isV2(message) && message.embeds.length === 0 && message.content.includes(DETAILS_MARK)) {
		// a text opening message
		const head = message.content.slice(0, message.content.indexOf(DETAILS_MARK));
		await message.edit({
			allowedMentions: { parse: [] },
			content: buildText(head, fields),
		});
		return true;
	}
	if (!isV2(message)) {
		if (message.embeds.length < 2) return false;
		const embeds = [...message.embeds];
		embeds[1] = new EmbedBuilder(embeds[1].data).setFields(fields);
		await message.edit({ embeds });
		return true;
	}
	const details = new TextDisplayBuilder()
		.setId(IDS.details)
		.setContent(fields.length ? fieldsToMarkdown(fields) : '-# —')
		.toJSON();
	const {
		components,
		found,
	} = replaceById(message.components.map(toJSON), IDS.details, details);
	if (!found) return false;
	await message.edit({ components });
	return true;
}

module.exports = {
	DETAILS_MARK,
	IDS,
	LIMITS,
	buildButtons,
	buildOpeningMessage,
	editOpeningButtons,
	editOpeningDetails,
	getAllowedMentions,
	isV2,
	replaceById,
	toColour,
};
