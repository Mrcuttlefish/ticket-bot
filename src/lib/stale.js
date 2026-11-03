const { isStaff } = require('./users');
const { isRelay } = require('./tickets/anonymous');
const {
	getPingRoles, resolveCategorySettings,
} = require('./tickets/options');
const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} = require('discord.js');
const ExtendedEmbedBuilder = require('./embed');
const { buttonEmoji } = require('./icons');

module.exports = async function handleStaleTickets(client, staleInterval) {
	client.log.info.cron('Handling stale tickets');
	const closeCommand = client.application.commands.cache.find(c => c.name === 'close');
	// categories can override the guild's stale and auto-close settings (upstream #536), and tickets with a
	// close request are handled even if nothing becomes stale in their guild
	const tickets = await client.prisma.ticket.findMany({
		include: {
			category: true,
			guild: true,
		},
		where: {
			OR: [
				{ id: { in: [...client.tickets.$stale.keys()] } },
				{ category: { staleAfter: { gte: staleInterval } } },
				{
					category: { staleAfter: null },
					guild: { staleAfter: { gte: staleInterval } },
				},
				{
					categoryId: null,
					guild: { staleAfter: { gte: staleInterval } },
				},
			],
			open: true,
		},
	});
	let processed = 0;
	let closed = 0;
	let marked = 0;

	for (const ticket of tickets) {
		const { guild } = ticket;
		const settings = resolveCategorySettings(guild, ticket.category);
		const getMessage = client.i18n.getLocale(guild.locale);
		try {
			processed++;
			if (client.tickets.$stale.has(ticket.id)) {
				const $ = client.tickets.$stale.get(ticket.id);
				if (!$.closeAt) continue; // auto-close is turned off
				const autoCloseAfter = $.closeAt - $.staleSince;
				const halfway = $.closeAt - (autoCloseAfter / 2);
				const channel = client.channels.cache.get(ticket.id);
				if (!channel) {
					client.tickets.$stale.delete(ticket.id);
					continue;
				}
				if (Date.now() >= halfway && Date.now() < halfway + staleInterval) {
					await channel.send({
						embeds: [
							new ExtendedEmbedBuilder()
								.setColor(guild.primaryColour)
								.setTitle(getMessage('ticket.closing_soon.title'))
								.setDescription(getMessage('ticket.closing_soon.description', { timestamp: Math.floor(($.closeAt + staleInterval) / 1000) })),
						],
					});
				} else if ($.closeAt < Date.now()) {
					await client.tickets.finallyClose(ticket.id, $);
					closed++;
				}
			} else if (settings.staleAfter && Date.now() - (ticket.lastMessageAt || ticket.createdAt) >= settings.staleAfter) {
				// Stale state is kept in memory, so it is lost when the bot restarts. Base the close time on the
				// ticket's last activity rather than "now", otherwise regular restarts mean tickets (especially
				// ones with no messages) are re-marked as stale forever and never close (upstream #552).
				const lastActivity = (ticket.lastMessageAt || ticket.createdAt).getTime();
				const closeAt = settings.autoClose ? lastActivity + settings.staleAfter + settings.autoClose : null;
				if (closeAt && closeAt <= Date.now()) {
					await client.tickets.finallyClose(ticket.id, {
						closedBy: null,
						reason: 'inactivity',
					});
					closed++;
					continue;
				}

				// set as stale
				/** @type {import("discord.js").TextChannel} */
				const channel = await client.channels.fetch(ticket.id).catch(() => null);
				if (!channel) {
					await client.tickets.finallyClose(ticket.id, { reason: 'channel deleted' });
					closed++;
					continue;
				}
				// relays of anonymous staff messages are sent by the bot but count as staff messages
				const messages = (await channel.messages.fetch({ limit: 5 })).filter(m => m.author.id !== client.user.id || isRelay(m, client.user.id));
				let ping = '';

				if (messages.size > 0) {
					const lastMessage =  messages.first();
					const staff = isRelay(lastMessage, client.user.id) || await isStaff(channel.guild, lastMessage.author.id);
					if (staff) {
						ping = `<@${ticket.createdById}>`;
					} else {
						const creator = channel.guild.members.cache.get(ticket.createdById);
						ping = getPingRoles(ticket.category, id => Boolean(creator?.roles.cache.has(id))).map(r => `<@&${r}>`).join(' ');
					}
				}

				const sent = await channel.send({
					components: [
						new ActionRowBuilder()
							.addComponents(
								new ButtonBuilder()
									.setCustomId(JSON.stringify({ action: 'close' }))
									.setStyle(ButtonStyle.Danger)
									.setEmoji(buttonEmoji(getMessage, 'close'))
									.setLabel(getMessage('buttons.close.text')),
							),
					],
					content: ping,
					embeds: [
						new ExtendedEmbedBuilder({
							iconURL: channel.guild.iconURL(),
							text: guild.footer,
						})
							.setColor(guild.primaryColour)
							.setTitle(getMessage('ticket.inactive.title'))
							.setDescription(getMessage('ticket.inactive.description', {
								close: closeCommand ? `</${closeCommand.name}:${closeCommand.id}>` : '`/close`',
								timestamp: Math.floor((ticket.lastMessageAt || ticket.createdAt).getTime() / 1000),
							})),
					],
				});

				client.tickets.$stale.set(ticket.id, {
					closeAt,
					closedBy: null,
					message: sent,
					messages: 0,
					reason: 'inactivity',
					staleSince: Date.now(),
				});
				marked++;
			}
		} catch (error) {
			client.log.error(error);
		}
	}
	client.log.success.cron({
		closed,
		marked,
		processed,
		stale: client.tickets.$stale.size,
	});
};