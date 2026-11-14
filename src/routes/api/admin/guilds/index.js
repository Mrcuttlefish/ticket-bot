const { PermissionsBitField } = require('discord.js');
const { iconURL } = require('../../../../lib/misc');
const { hasDashboardRole } = require('../../../../lib/users');

module.exports.get = fastify => ({
	handler: async (req, res) => {
		const { client } = req.routeOptions.config;
		const guilds = await (await fetch('https://discordapp.com/api/users/@me/guilds', { headers: { 'Authorization': `Bearer ${req.user.accessToken}` } })).json();
		const canManage = async guild => {
			if (guild.owner || new PermissionsBitField(guild.permissions.toString()).has(PermissionsBitField.Flags.ManageGuild)) return true;
			// or they have one of the server's dashboard roles (only servers the bot is in have any)
			const cached = client.guilds.cache.get(guild.id);
			if (!cached) return false;
			const member = await cached.members.fetch(req.user.id).catch(() => null);
			return hasDashboardRole(member);
		};
		const allowed = [];
		for (const guild of Array.isArray(guilds) ? guilds : []) {
			if (await canManage(guild)) allowed.push(guild);
		}
		res.send(
			allowed.map(guild => ({
				added: client.guilds.cache.has(guild.id),
				id: guild.id,
				logo: iconURL(
					client.guilds.cache.get(guild.id) ||
					{
						client,
						icon: guild.icon,
						id: guild.id,
					},
				),
				name: guild.name,
			})),
		);
	},
	onRequest: [fastify.authenticate],
});
