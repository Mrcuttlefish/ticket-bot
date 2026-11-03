/**
 * Plain-text version of an archived embed for transcripts.
 * Most of the bot's own messages are embeds, which used to show as "[embedded content]" (upstream #504).
 * Archived embeds are discord.js `Embed` objects spread into plain objects, so the fields are under `data`.
 * @param {object} embed
 * @returns {string}
 */
function embedToText(embed) {
	const data = embed?.data ?? embed ?? {};
	const lines = [];
	if (data.author?.name) lines.push(data.author.name);
	if (data.title) lines.push(`**${data.title}**`);
	if (data.description) lines.push(data.description);
	for (const field of data.fields ?? []) {
		if (field?.name || field?.value) lines.push(`${field.name ?? ''}: ${field.value ?? ''}`);
	}
	if (data.image?.url) lines.push(data.image.url);
	if (data.footer?.text) lines.push(data.footer.text);
	if (lines.length === 0) return '[embedded content]';
	return '[embed] ' + lines.join('\n').replace(/\n/g, '\n\t');
}

module.exports = { embedToText };
