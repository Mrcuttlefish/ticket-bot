const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ChannelType } = require('discord.js');

const GUILD = '100000000000000001';
const OTHER_CHANNEL = '800000000000000008';
const USER = '200000000000000002';

const fastify = {
	authenticate: () => {},
	isAdmin: () => {},
};

function fakeClient({ channels = [] } = {}) {
	const updates = [];
	const guild = {
		channels: { cache: new Map(channels.map(c => [c.id, c])) },
		id: GUILD,
		members: {
			fetch: async () => ({
				user: {
					id: USER,
					tag: 'user',
				},
			}),
		},
		name: 'Test',
		roles: { cache: new Map() },
	};
	const client = {
		guilds: { cache: new Map([[GUILD, guild]]) },
		log: { info: Object.assign(() => {}, { settings: () => {} }) },
		prisma: {
			guild: {
				findUnique: async () => ({
					id: GUILD,
					logChannel: null,
				}),
				update: async args => {
					updates.push(args);
					return {
						...args.data,
						categories: [],
					};
				},
			},
		},
		tickets: { getCategory: async () => {} },
	};
	return {
		client,
		guild,
		updates,
	};
}

test('PATCH settings only writes allowlisted fields', async () => {
	const route = require('../src/routes/api/admin/guilds/[guild]/settings.js').patch(fastify);
	const {
		client, updates,
	} = fakeClient();
	await route.handler({
		body: {
			archive: false,
			categories: { connect: { id: 5 } },
			tickets: { connect: [{ id: '1' }] },
		},
		params: { guild: GUILD },
		routeOptions: { config: { client } },
		user: { id: USER },
	});
	assert.equal(updates.length, 1);
	assert.deepEqual(updates[0].data, { archive: false });
	assert.deepEqual(updates[0].where, { id: GUILD });
});

test('PATCH settings rejects a log channel from another server', async () => {
	const route = require('../src/routes/api/admin/guilds/[guild]/settings.js').patch(fastify);
	const {
		client, updates,
	} = fakeClient();
	await assert.rejects(route.handler({
		body: { logChannel: OTHER_CHANNEL },
		params: { guild: GUILD },
		routeOptions: { config: { client } },
		user: { id: USER },
	}), { statusCode: 400 });
	assert.equal(updates.length, 0);
});

test('POST panel rejects a channel from another server', async () => {
	const route = require('../src/routes/api/admin/guilds/[guild]/panels.js').post(fastify);
	const { client } = fakeClient({
		channels: [{
			id: '900000000000000009',
			isTextBased: () => true,
			type: ChannelType.GuildText,
		}],
	});
	client.prisma.guild.findUnique = async () => ({
		categories: [{
			id: 1,
			name: 'Support',
		}],
		locale: 'en-GB',
	});
	client.i18n = { getLocale: () => () => '' };
	let sent;
	const res = {
		code(status) {
			this.status = status;
			return this;
		},
		send(body) {
			sent = body;
			return this;
		},
	};
	await route.handler({
		body: {
			categories: [1],
			channel: OTHER_CHANNEL,
			type: 'BUTTON',
		},
		params: { guild: GUILD },
		routeOptions: { config: { client } },
		user: { id: USER },
	}, res);
	assert.equal(res.status, 400);
	assert.match(sent.message, /text channel in this server/);
});
