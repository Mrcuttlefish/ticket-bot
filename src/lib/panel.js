/**
 * Builds the message for a ticket panel, as an embed (the default) or with Discord's layout components
 * ("Components V2", upstream #655) when the guild turns `componentsV2` on.
 */

const {
	ActionRowBuilder,
	ContainerBuilder,
	EmbedBuilder,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	MessageFlags,
	SectionBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder,
} = require('discord.js');
const { toColour } = require('./tickets/opening-message');

/**
 * @param {object} options
 * @param {boolean} options.v2
 * @param {string} options.colour
 * @param {string} [options.title]
 * @param {string} [options.description]
 * @param {string} [options.image]
 * @param {string} [options.thumbnail]
 * @param {{ text: string, iconURL?: string|null }|null} [options.footer]
 * @param {import('discord.js').ButtonBuilder[]|import('discord.js').StringSelectMenuBuilder[]} [options.controls]
 * @param {boolean} [options.editing] whether an existing message is being edited (its old content is cleared)
 * @returns {object} message options
 */
function buildPanel({
	v2,
	colour,
	title,
	description,
	image,
	thumbnail,
	footer = null,
	controls = [],
	editing = false,
}) {
	const row = controls.length ? new ActionRowBuilder().setComponents(controls) : null;

	if (!v2) {
		const embed = new EmbedBuilder().setColor(colour);
		if (footer) embed.setFooter(footer);
		if (title) embed.setTitle(title);
		if (description) embed.setDescription(description);
		if (image) embed.setImage(image);
		if (thumbnail) embed.setThumbnail(thumbnail);
		return {
			components: row ? [row] : [],
			embeds: [embed],
		};
	}

	const container = new ContainerBuilder();
	const accent = toColour(colour);
	if (accent !== undefined) container.setAccentColor(accent);
	const text = [title && `## ${title}`, description].filter(Boolean).join('\n') || '​';
	const display = new TextDisplayBuilder().setContent(text);
	if (thumbnail) {
		container.addSectionComponents(
			new SectionBuilder()
				.addTextDisplayComponents(display)
				.setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnail)),
		);
	} else {
		container.addTextDisplayComponents(display);
	}
	if (image) container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(image)));
	if (row) container.addActionRowComponents(row);
	if (footer?.text) container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${footer.text}`));

	return {
		components: [container],
		// an embed panel can be changed to the new style by editing it; its old content and embeds are removed
		...(editing && {
			content: null,
			embeds: [],
		}),
		flags: MessageFlags.IsComponentsV2,
	};
}

module.exports = { buildPanel };
