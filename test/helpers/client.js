/**
 * A bot client for integration tests: the real i18n, cache, ticket manager and database,
 * with fake Discord objects (see discord.js) and a silent logger.
 */

const { join } = require('node:path');
const fs = require('node:fs');
const YAML = require('yaml');
const Keyv = require('keyv');
const I18n = require('@eartharoid/i18n');
const { Collection } = require('discord.js');
const TTLMap = require('../../src/lib/ttl-map');
const { createTestDatabase } = require('./db');
const { makeUser } = require('./discord');

process.env.ENCRYPTION_KEY ??= 'test-encryption-key-that-is-at-least-48-characters-long';

const loadLocales = () => {
	const dir = join(__dirname, '../../src/i18n');
	return Object.fromEntries(
		fs.readdirSync(dir)
			.filter(file => file.endsWith('.yml'))
			.map(file => [file.slice(0, -4), YAML.parse(fs.readFileSync(join(dir, file), 'utf8'))]),
	);
};
let locales;

// a logger where every level (and every `log.level.category`) records but prints nothing
function makeLogger() {
	const entries = [];
	const level = name => new Proxy((() => {}), {
		apply: (_, __, args) => entries.push([name, ...args]),
		get: (_, category) => (...args) => entries.push([`${name}.${String(category)}`, ...args]),
	});
	return new Proxy({ entries }, { get: (target, name) => (name === 'entries' ? entries : level(name)) });
}

/**
 * @param {object} [options]
 * @param {object} [options.config] user config (config.yml)
 * @returns {Promise<object>} a client, with `cleanup()`
 */
async function createTestClient({ config = {} } = {}) {
	const db = await createTestDatabase();
	locales ??= loadLocales();
	const user = makeUser({
		bot: true,
		username: 'Tickets',
	});
	const client = {
		application: {
			commands: {
				cache: new Collection(),
				permissions: {
					fetch: async () => [],
					set: async () => [],
				},
			},
		},
		channels: {
			cache: new Collection(),
			fetch: async id => client.channels.cache.get(id) ?? null,
		},
		config: {
			tickets: { channelTopic: 'full' },
			...config,
		},
		guilds: { cache: new Collection() },
		i18n: new I18n('en-GB', locales),
		keyv: new Keyv({ store: new TTLMap() }),
		log: makeLogger(),
		prisma: db.prisma,
		supers: [],
		user,
		ws: {
			ping: 10,
			shards: new Collection(),
			status: 0,
		},
	};
	const TicketManager = require('../../src/lib/tickets/manager');
	client.tickets = new TicketManager(client);
	client.tickets.closeDelay = 0;
	client.cleanup = async () => {
		await db.cleanup();
	};
	return client;
}

module.exports = { createTestClient };

/**
 * Create the guild settings and a category in the database, with a matching Discord category channel.
 * @returns {Promise<{ category: object, discordCategory: object }>}
 */
async function seedCategory(client, guild, {
	settings = {}, discordCategory, ...data
} = {}) {
	const { makeCategoryChannel } = require('./discord');
	discordCategory ??= makeCategoryChannel(guild);
	await client.prisma.guild.upsert({
		create: {
			id: guild.id,
			...settings,
		},
		update: settings,
		where: { id: guild.id },
	});
	const category = await client.prisma.category.create({
		data: {
			channelName: 'ticket-{num}',
			description: 'Get help',
			discordCategory: discordCategory.id,
			emoji: '🎫',
			guild: { connect: { id: guild.id } },
			name: 'Support',
			openingMessage: 'Hello {name}',
			staffRoles: [],
			...data,
		},
	});
	return {
		category,
		discordCategory,
	};
}

/**
 * Register before/after hooks that create a fresh client for the test file and clean up afterwards,
 * including worker threads.
 * @returns {{ client: object }} `client` is set once the `before` hook has run
 */
function useTestClient(options) {
	const {
		after, before,
	} = require('node:test');
	const context = {};
	before(async () => {
		context.client = await createTestClient(options);
	});
	after(async () => {
		await context.client?.cleanup();
		await require('../../src/lib/threads').terminatePools();
	});
	return context;
}

module.exports.seedCategory = seedCategory;
module.exports.useTestClient = useTestClient;
