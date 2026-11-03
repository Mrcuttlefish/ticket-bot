/**
 * Tag suggestions (upstream #440): before a ticket is created, tags that match its topic or answers are shown.
 * The creator can open the ticket anyway, or say a tag solved their problem, which counts towards the tag's
 * `preventedCount` and doesn't open a ticket. Turned on per category with `suggestTags`.
 */

const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
} = require('discord.js');
const ms = require('ms');
const ExtendedEmbedBuilder = require('../embed');
const { compileTagRegex } = require('../security');
const {
	fillTagPlaceholders, getGuildTags,
} = require('../tags');

const MAX_SUGGESTIONS = 3;
const PREVIEW_LENGTH = 300;
const TIMEOUT = ms('5m');

const escapeRegExp = string => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Tags whose pattern matches the text, or whose name appears in it as a whole word or phrase.
 * Pattern matches come first (longer, more specific patterns before shorter ones), then name matches.
 * @param {{ name: string, regex?: string | null }[]} tags
 * @param {string} text
 * @param {number} [limit]
 * @returns {object[]}
 */
function findSuggestedTags(tags, text, limit = MAX_SUGGESTIONS) {
	if (!text?.trim()) return [];
	return tags
		.map(tag => {
			const regex = compileTagRegex(tag.regex);
			let score = 0;
			if (regex?.test(text)) score = 1000 + tag.regex.length;
			else if (tag.name.trim().length >= 3 && new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(tag.name.trim())}($|[^\\p{L}\\p{N}])`, 'iu').test(text)) score = 1;
			return {
				score,
				tag,
			};
		})
		.filter(match => match.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map(match => match.tag);
}

const truncate = (string, length) => (string.length > length ? string.slice(0, length - 1).trimEnd() + '…' : string);

/**
 * Show matching tags to the creator and wait for them to choose. The interaction must already be deferred.
 * @param {object} options
 * @param {import('client')} options.client
 * @param {import('discord.js').ModalSubmitInteraction} options.interaction
 * @param {object} options.category with `guild` settings
 * @param {Function} options.getMessage
 * @param {string} options.text the topic and answers
 * @returns {Promise<{ proceed: boolean, interaction?: import('discord.js').ButtonInteraction }>}
 * `proceed` is false if a tag solved the problem or the creator didn't answer
 */
async function offerTags({
	client, interaction, category, getMessage, text,
}) {
	const tags = findSuggestedTags(await getGuildTags(client, category.guild.id), text);
	if (tags.length === 0) return { proceed: true };

	const { guild: settings } = category;
	const embed = () => new ExtendedEmbedBuilder({
		iconURL: interaction.guild.iconURL(),
		text: settings.footer,
	});
	const reply = await interaction.editReply({
		components: [
			new ActionRowBuilder().setComponents(
				...tags.map(tag => new ButtonBuilder()
					.setCustomId(JSON.stringify({
						action: 'suggestion',
						tag: tag.id,
					}))
					.setStyle(ButtonStyle.Success)
					.setLabel(truncate(getMessage('ticket.suggestions.buttons.solved', { tag: tag.name }), 80))),
				new ButtonBuilder()
					.setCustomId(JSON.stringify({
						action: 'suggestion',
						tag: null,
					}))
					.setStyle(ButtonStyle.Secondary)
					.setLabel(getMessage('ticket.suggestions.buttons.continue')),
			),
		],
		embeds: [
			embed()
				.setColor(settings.primaryColour)
				.setTitle(getMessage('ticket.suggestions.title'))
				.setDescription(getMessage('ticket.suggestions.description'))
				.setFields(tags.map(tag => ({
					name: truncate(tag.name, 256),
					value: truncate(fillTagPlaceholders(tag.content, {
						guild: interaction.guild,
						user: interaction.member ?? interaction.user,
					}), PREVIEW_LENGTH),
				}))),
		],
	});

	let button;
	try {
		button = await reply.awaitMessageComponent({
			componentType: ComponentType.Button,
			filter: i => i.user.id === interaction.user.id,
			time: TIMEOUT,
		});
	} catch {
		await interaction.editReply({
			components: [],
			embeds: [
				embed()
					.setColor(settings.errorColour)
					.setTitle(getMessage('misc.expired.title'))
					.setDescription(getMessage('misc.expired.description')),
			],
		});
		return { proceed: false };
	}

	const { tag: tagId } = JSON.parse(button.customId);
	const solvedBy = tags.find(tag => tag.id === tagId);
	if (!solvedBy) {
		await button.update({ components: [] }); // the ticket's result replaces the embed
		return {
			interaction: button,
			proceed: true,
		};
	}
	await client.prisma.tag.update({
		data: { preventedCount: { increment: 1 } },
		where: { id: solvedBy.id },
	});
	await button.update({
		components: [],
		embeds: [
			embed()
				.setColor(settings.successColour)
				.setTitle(getMessage('ticket.suggestions.solved.title'))
				.setDescription(getMessage('ticket.suggestions.solved.description')),
		],
	});
	return { proceed: false };
}

module.exports = {
	MAX_SUGGESTIONS,
	PREVIEW_LENGTH,
	findSuggestedTags,
	offerTags,
};
