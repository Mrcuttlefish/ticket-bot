/* eslint-disable no-console */
// A small stand-in for Discord's REST API, OAuth2 and gateway, so the built image can log in
// and serve the dashboard in CI. run.sh points discord.com, discordapp.com and
// gateway.discord.gg at this server and gives the bot its CA.
// Usage: node fake-discord.js <cert.pem> <key.pem>
const fs = require('fs');
const https = require('https');
const zlib = require('zlib');
const { WebSocketServer } = require('ws');

const APP_ID = '100000000000000001';
const GUILD_ID = '451745464480432129';
const USER = {
	avatar: null,
	discriminator: '0',
	global_name: 'Smoke Admin',
	id: '319467558166069248',
	locale: 'en-GB',
	username: 'smoke-admin',
};
const BOT = {
	avatar: null,
	bot: true,
	discriminator: '0',
	id: APP_ID,
	username: 'Smoke Tickets',
};
const now = new Date().toISOString();
const member = user => ({
	deaf: false,
	flags: 0,
	joined_at: now,
	mute: false,
	roles: [],
	user,
});
const everyone = {
	color: 0,
	flags: 0,
	hoist: false,
	id: GUILD_ID,
	managed: false,
	mentionable: false,
	name: '@everyone',
	permissions: '1071698660929',
	position: 0,
};
const guild = {
	afk_channel_id: null,
	afk_timeout: 300,
	channels: [
		{
			guild_id: GUILD_ID,
			id: '451745464480432130',
			name: 'Tickets',
			permission_overwrites: [],
			position: 0,
			type: 4,
		},
	],
	default_message_notifications: 0,
	emojis: [],
	explicit_content_filter: 0,
	features: [],
	icon: null,
	id: GUILD_ID,
	joined_at: now,
	large: false,
	member_count: 2,
	members: [member(BOT), member(USER)],
	mfa_level: 0,
	name: 'Smoke Test Server',
	nsfw_level: 0,
	owner_id: USER.id,
	preferred_locale: 'en-GB',
	premium_tier: 0,
	presences: [],
	roles: [everyone],
	stage_instances: [],
	stickers: [],
	system_channel_flags: 0,
	threads: [],
	unavailable: false,
	verification_level: 0,
	voice_states: [],
};

const routes = {
	'GET /api/v10/applications/@me': {
		bot_public: false,
		description: '',
		flags: 0,
		icon: null,
		id: APP_ID,
		name: BOT.username,
		owner: USER,
	},
	[`GET /api/v10/applications/${APP_ID}/commands`]: [],
	[`GET /api/v10/applications/${APP_ID}/emojis`]: { items: [] },
	'GET /api/v10/gateway/bot': {
		session_start_limit: {
			max_concurrency: 1,
			remaining: 1000,
			reset_after: 0,
			total: 1000,
		},
		shards: 1,
		url: 'wss://gateway.discord.gg',
	},
	[`GET /api/v10/guilds/${GUILD_ID}/channels`]: guild.channels,
	[`GET /api/v10/guilds/${GUILD_ID}/members/${APP_ID}`]: member(BOT),
	[`GET /api/v10/guilds/${GUILD_ID}/members/${USER.id}`]: member(USER),
	[`GET /api/v10/guilds/${GUILD_ID}/roles`]: guild.roles,
	'GET /api/oauth2/@me': { scopes: ['applications.commands.permissions.update', 'guilds', 'identify'] },
	'GET /api/users/@me': USER,
	'GET /api/users/@me/guilds': [{
		features: [],
		icon: null,
		id: GUILD_ID,
		name: guild.name,
		owner: true,
		permissions: '2251799813685247',
	}],
	'POST /api/oauth2/token': {
		access_token: 'smoke-access-token',
		expires_in: 604800,
		scope: 'applications.commands.permissions.update guilds identify',
		token_type: 'Bearer',
	},
	'POST /api/oauth2/token/revoke': {},
};

const server = https.createServer({
	cert: fs.readFileSync(process.argv[2]),
	key: fs.readFileSync(process.argv[3]),
}, (req, res) => {
	const path = req.url.split('?')[0].replace(/^\/api\/v\d+\/(users|oauth2)\//, '/api/$1/');
	const key = `${req.method} ${path}`;
	const body = key in routes ? routes[key] : routes[`${req.method} ${req.url.split('?')[0]}`];
	req.resume();
	if (body === undefined) {
		console.log(`404 ${req.method} ${req.headers.host}${req.url}`);
		res.writeHead(404, { 'content-type': 'application/json' });
		return res.end(JSON.stringify({
			code: 0,
			message: '404: Not Found',
		}));
	}
	console.log(`200 ${req.method} ${req.headers.host}${req.url}`);
	res.writeHead(200, { 'content-type': 'application/json' });
	res.end(JSON.stringify(body));
});

const wss = new WebSocketServer({ server });
wss.on('connection', (socket, req) => {
	console.log(`gateway connection ${req.url}`);
	const compressed = req.url.includes('compress=zlib-stream');
	const deflate = compressed && zlib.createDeflate();
	let seq = 0;
	let queue = Promise.resolve();
	const send = (op, d, t = null) => {
		const payload = JSON.stringify({
			d,
			op,
			s: op === 0 ? ++seq : null,
			t,
		});
		queue = queue.then(() => new Promise(resolve => {
			if (!compressed) {
				socket.send(payload);
				return resolve();
			}
			const chunks = [];
			const onData = chunk => chunks.push(chunk);
			deflate.on('data', onData);
			deflate.write(payload);
			deflate.flush(zlib.constants.Z_SYNC_FLUSH, () => {
				deflate.off('data', onData);
				socket.send(Buffer.concat(chunks));
				resolve();
			});
		}));
	};
	send(10, { heartbeat_interval: 41250 });
	socket.on('message', raw => {
		const {
			op, d,
		} = JSON.parse(raw.toString());
		if (op === 1) send(11, null);
		if (op === 2) {
			send(0, {
				application: {
					flags: 0,
					id: APP_ID,
				},
				guilds: [{
					id: GUILD_ID,
					unavailable: true,
				}],
				resume_gateway_url: 'wss://gateway.discord.gg',
				session_id: 'smoke',
				shard: [0, 1],
				user: BOT,
				v: 10,
			}, 'READY');
			send(0, guild, 'GUILD_CREATE');
		}
		if (op === 8) {
			send(0, {
				chunk_count: 1,
				chunk_index: 0,
				guild_id: d.guild_id,
				members: guild.members,
				nonce: d.nonce,
			}, 'GUILD_MEMBERS_CHUNK');
		}
	});
});

server.listen(443, () => console.log('fake Discord listening on 443'));
