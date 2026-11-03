const { ChannelType: { GuildCategory } } = require('discord.js');
const { ValidationError } = require('./validation');

/**
 * Check the roles and channels a category refers to belong to its guild.
 * Roles that aren't in the guild (deleted, or from another server) are dropped. Discord categories from
 * another server are rejected; unknown ones are tolerated because they may have been deleted.
 * @param {import('discord.js').Guild} guild
 * @param {object} data sanitised category data, modified in place
 * @param {(id: string) => import('discord.js').Channel | undefined} getChannel
 * @returns {object} data
 */
function checkCategoryRefs(guild, data, getChannel) {
	const hasRole = id => guild.roles.cache.has(id);
	for (const field of ['staffRoles', 'pingRoles', 'requiredRoles']) {
		if (data[field]) data[field] = data[field].filter(hasRole);
	}
	if (data.roleLimits) data.roleLimits = data.roleLimits.filter(rule => hasRole(rule.role));
	if (data.pingRoleRules) {
		data.pingRoleRules = data.pingRoleRules
			.map(rule => ({
				ping: rule.ping.filter(hasRole),
				roles: rule.roles.filter(hasRole),
			}))
			.filter(rule => rule.roles.length > 0);
	}

	const checkChannel = (id, field) => {
		const channel = getChannel(id);
		if (channel && (channel.guildId !== guild.id || channel.type !== GuildCategory)) {
			throw new ValidationError(field, 'must be a category channel in this server');
		}
	};
	if (data.discordCategory) checkChannel(data.discordCategory, 'discordCategory');
	if (data.fallbackCategories) {
		if (data.fallbackCategories.length > 25) throw new ValidationError('fallbackCategories', 'must have at most 25 categories');
		data.fallbackCategories.forEach((id, i) => checkChannel(id, `fallbackCategories[${i}]`));
	}
	return data;
}

module.exports = { checkCategoryRefs };
