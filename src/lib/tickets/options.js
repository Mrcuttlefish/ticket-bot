/**
 * Pure helpers for per-category ticket options, kept out of the manager so they can be tested.
 */

/**
 * The most tickets a member can have open in a category (upstream #385).
 * Role limits override the category's member limit; if a member has several of the roles, the highest limit wins.
 * @param {{ memberLimit: number, roleLimits?: { role: string, limit: number }[] }} category
 * @param {(roleId: string) => boolean} hasRole
 * @returns {number}
 */
function getMemberLimit(category, hasRole) {
	const matching = (category.roleLimits ?? []).filter(rule => hasRole(rule.role));
	if (matching.length === 0) return category.memberLimit;
	return Math.max(...matching.map(rule => rule.limit));
}

/**
 * The roles to ping when a ticket is opened (upstream #386).
 * If the creator has the roles of any ping rule, the roles of every matching rule are pinged instead of the category's ping roles.
 * @param {{ pingRoles: string[], pingRoleRules?: { roles: string[], ping: string[] }[] }} category
 * @param {(roleId: string) => boolean} hasRole
 * @returns {string[]}
 */
function getPingRoles(category, hasRole) {
	const matching = (category.pingRoleRules ?? []).filter(rule => rule.roles.length > 0 && rule.roles.some(hasRole));
	if (matching.length === 0) return category.pingRoles;
	return [...new Set(matching.flatMap(rule => rule.ping))];
}

/**
 * The Discord category to create a ticket channel in (upstream #472).
 * Discord categories can hold 50 channels, so the fallback categories are tried in order once the main one is full.
 * @param {{ discordCategory: string, fallbackCategories?: string[] }} category
 * @param {(channelId: string) => number | null} countChildren the number of channels in a category, or null if it doesn't exist
 * @returns {string | null} null if every category is full or missing
 */
function pickDiscordCategory(category, countChildren) {
	for (const id of [category.discordCategory, ...(category.fallbackCategories ?? [])]) {
		const count = countChildren(id);
		if (count !== null && count !== undefined && count < 50) return id;
	}
	return null;
}

/**
 * The number to start counting from (upstream #416). Raising the offset lets servers continue the numbering
 * from another ticket bot; the numbers never go backwards.
 * @param {number | null} max the highest ticket number in the guild
 * @param {number} [offset]
 * @returns {number} the number of the previous ticket
 */
function getNumberBase(max, offset = 0) {
	return Math.max(max ?? 0, offset ?? 0);
}

module.exports = {
	getMemberLimit,
	getNumberBase,
	getPingRoles,
	pickDiscordCategory,
};
