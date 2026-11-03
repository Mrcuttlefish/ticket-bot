/**
 * Placeholder formatting shared by ticket creation, /move, /transfer and transcripts.
 */

/**
 * @param {number} number
 * @param {number|string} [padding] minimum number of digits, e.g. 4 -> 0012 (upstream #543)
 * @returns {string}
 */
function formatNumber(number, padding) {
	const width = Math.min(Number(padding) || 0, 10);
	return String(number).padStart(width, '0');
}

/**
 * Replace `{num}`, `{number}`, `{num:4}` and `{number:4}` (zero-padded).
 * @param {string} template
 * @param {number} number
 * @param {boolean} [avoid1488] channel names avoid "1488"
 * @returns {string}
 */
function replaceNumber(template, number, avoid1488 = false) {
	return template.replace(/{+\s?num(?:ber)?(?::(\d{1,2}))?\s?}+/gi, (_, padding) => {
		if (avoid1488 && number === 1488) return '1487b';
		return formatNumber(number, padding);
	});
}

/**
 * @param {string} template the category's `channelName`
 * @param {object} values
 * @param {string} values.username
 * @param {string} values.displayName
 * @param {number} values.number
 * @returns {string}
 */
function formatChannelName(template, {
	claimer, displayName, number, username,
}) {
	return replaceNumber(
		template
			.replace(/{+\s?claimer\s?}+/gi, claimer ?? '')
			.replace(/{+\s?(user)?name\s?}+/gi, username)
			.replace(/{+\s?(nick|display)(name)?\s?}+/gi, displayName),
		number,
		true,
	);
}

/**
 * Opening message placeholders (upstream #448). `{name}`/`{username}` keep their original meaning (a mention).
 * @param {string} template the category's `openingMessage`
 * @param {object} values
 * @returns {string}
 */
function formatOpeningMessage(template, {
	avgRating, avgResolutionTime, avgResponseTime, category, creator, number, topic,
}) {
	const values = {
		avgrating: avgRating,
		avgresolutiontime: avgResolutionTime,
		avgresponsetime: avgResponseTime,
		category: category?.name,
		description: category?.description,
		displayname: creator?.displayName,
		mention: creator?.toString(),
		name: creator?.toString(),
		tag: creator?.user?.username,
		topic,
		username: creator?.toString(),
	};
	return replaceNumber(template, number).replace(/{+\s?([a-z]+)\s?}+/gi, (match, key) => {
		const value = values[key.toLowerCase()];
		return value === undefined || value === null ? match : String(value);
	});
}

/**
 * Channel topic for a ticket. `mode` comes from `tickets.channelTopic` in config.yml (upstream #683):
 * - `full` (default): "@creator | topic"
 * - `topic`: only the topic
 * - `creator`: only the creator mention
 * - `none`: no channel topic (nothing appears in the audit log)
 * @param {string} [mode]
 * @param {string} creator a user mention
 * @param {string?} topic
 * @returns {string|null}
 */
function formatChannelTopic(mode = 'full', creator, topic) {
	switch (mode) {
	case 'none':
		return null;
	case 'creator':
		return creator;
	case 'topic':
		return topic || null;
	default:
		return `${creator}${topic?.length > 0 ? ` | ${topic}` : ''}`;
	}
}

module.exports = {
	formatChannelName,
	formatChannelTopic,
	formatNumber,
	formatOpeningMessage,
	replaceNumber,
};
