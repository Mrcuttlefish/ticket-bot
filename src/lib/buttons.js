/**
 * Button customisation (Ticket Tool parity, P2): servers can change the label, emoji and colour of the bot's
 * buttons (`guild.buttons`, validated in validation.js), and categories can change their panel button
 * (`buttonLabel` and `buttonStyle`). Anything not set keeps the default from the locale and icons.
 */

const {
	ButtonStyle,
	MessageFlags,
	PermissionFlagsBits,
} = require('discord.js');
const emoji = require('node-emoji');

const STYLES = {
	DANGER: ButtonStyle.Danger,
	PRIMARY: ButtonStyle.Primary,
	SECONDARY: ButtonStyle.Secondary,
	SUCCESS: ButtonStyle.Success,
};

/**
 * @param {string | null | undefined} style PRIMARY, SECONDARY, SUCCESS or DANGER
 * @returns {import('discord.js').ButtonStyle | undefined}
 */
const toButtonStyle = style => STYLES[style];

/**
 * An emoji as Discord's button API wants it: a unicode emoji, `name`/`:name:` shortcodes, or a custom emoji
 * (`<:name:id>`, `<a:name:id>` or an ID).
 * @param {string | null | undefined} value
 * @returns {string | { id: string, name?: string, animated?: boolean } | undefined}
 */
function toButtonEmoji(value) {
	if (!value) return undefined;
	const custom = /^<(a)?:(\w{2,32}):(\d{17,20})>$/.exec(value);
	if (custom) {
		return {
			animated: Boolean(custom[1]),
			id: custom[3],
			name: custom[2],
		};
	}
	if (/^\d{17,20}$/.test(value)) return { id: value };
	const name = value.replace(/^:|:$/g, '');
	if (emoji.hasEmoji(name)) return emoji.get(name);
	return value; // a unicode emoji
}

/**
 * Apply a server's customisation to one of the bot's buttons.
 * @param {import('discord.js').ButtonBuilder} button with its default label, emoji and style
 * @param {Record<string, { label?: string, emoji?: string, style?: string }> | null | undefined} custom guild.buttons
 * @param {string} name the button (see CUSTOM_BUTTONS in validation.js)
 * @returns {import('discord.js').ButtonBuilder}
 */
function customiseButton(button, custom, name) {
	const settings = custom?.[name];
	if (!settings) return button;
	if (settings.label) button.setLabel(settings.label);
	const buttonEmoji = toButtonEmoji(settings.emoji);
	if (buttonEmoji) button.setEmoji(buttonEmoji);
	const style = toButtonStyle(settings.style);
	if (style !== undefined) button.setStyle(style);
	return button;
}

/**
 * Whether a member can use one of the bot's buttons. Servers can limit buttons to some roles (`allow`) or keep
 * some roles from using them (`deny`). Members with Manage Server can always use every button, so nobody can lock
 * the server's admins out.
 * @param {import('discord.js').GuildMember} member
 * @param {Record<string, { allow?: string[], deny?: string[] }> | null | undefined} custom guild.buttons
 * @param {string} name the button
 * @returns {boolean}
 */
function canUseButton(member, custom, name) {
	const settings = custom?.[name];
	if (!settings || (!settings.allow?.length && !settings.deny?.length)) return true;
	if (!member) return false;
	if (member.guild?.ownerId === member.id || member.permissions?.has?.(PermissionFlagsBits.ManageGuild)) return true;
	const has = id => member.roles?.cache?.has(id);
	if (settings.deny?.some(has)) return false;
	if (settings.allow?.length && !settings.allow.some(has)) return false;
	return true;
}

/**
 * Check a button's role limits before running it. Replies (privately) and returns true if the member can't use it.
 * @param {import('client')} client
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {string} name the button
 * @returns {Promise<boolean>}
 */
async function buttonDenied(client, interaction, name) {
	if (!interaction.guild) return false;
	const settings = await client.prisma.guild.findUnique({
		select: {
			buttons: true,
			errorColour: true,
			locale: true,
		},
		where: { id: interaction.guild.id },
	});
	if (canUseButton(interaction.member, settings?.buttons, name)) return false;
	const getMessage = client.i18n.getLocale(settings?.locale);
	const ExtendedEmbedBuilder = require('./embed');
	await interaction.reply({
		embeds: [
			new ExtendedEmbedBuilder()
				.setColor(settings?.errorColour ?? 'Red')
				.setTitle(getMessage('misc.button_denied.title'))
				.setDescription(getMessage('misc.button_denied.description')),
		],
		flags: MessageFlags.Ephemeral,
	});
	return true;
}

module.exports = {
	buttonDenied,
	canUseButton,
	customiseButton,
	toButtonEmoji,
	toButtonStyle,
};
