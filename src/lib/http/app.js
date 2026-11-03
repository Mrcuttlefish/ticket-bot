const {
	getJWTSecret, isTokenCurrent,
} = require('../jwt-secret');
const Fastify = require('fastify');
const { short } = require('leeks.js');
const { join } = require('path');
const { files } = require('node-dir');
const { getPrivilegeLevel } = require('../users');
const { format } = require('util');

/**
 * Build the HTTP API: plugins, auth, hooks and every route in src/routes.
 * The settings UI and `listen()` are added by src/http.js, so tests can use this with `app.inject()`.
 * @param {import("client")} client
 * @returns {Promise<import('fastify').FastifyInstance>}
 */
module.exports = async function buildApp(client) {
	const fastify = Fastify({ trustProxy: process.env.HTTP_TRUST_PROXY === 'true' });

	// for file uploads
	fastify.register(require('@fastify/multipart'), { limits: { fileSize: 2 ** 27 } }); // 128 MiB

	// cookies plugin, must be registered before oauth2 since oauth2@7.2.0
	fastify.register(require('@fastify/cookie'));

	// jwt plugin
	fastify.register(require('@fastify/jwt'), {
		cookie: {
			cookieName: 'token',
			signed: false,
		},
		// a key derived from ENCRYPTION_KEY, not the key itself (S10)
		secret: getJWTSecret(process.env.ENCRYPTION_KEY),
	});

	// Activate Sentry if SENTRY_DNS is set
	if (process.env.SENTRY_DSN) {
		const Sentry = require('@sentry/node');
		Sentry.setupFastifyErrorHandler(fastify);
	}

	// auth
	fastify.decorate('authenticate', async (req, res) => {
		try {
			const data = await req.jwtVerify();
			if (!isTokenCurrent(data, process.env.INVALIDATE_TOKENS)) throw 'expired';
		} catch (error) {
			return res.code(401).send({
				error: 'Unauthorised',
				message: error === 'expired' ? 'Your token has expired; please re-authenticate.' : 'You are not authenticated.',
				statusCode: 401,
			});
		}
	});

	fastify.decorate('isMember', async (req, res) => {
		try {
			const userId = req.user.id;
			const guildId = req.params.guild;
			const guild = client.guilds.cache.get(guildId);
			if (!guild) {
				return res.code(404).send({
					error: 'Not Found',
					message: 'The requested resource could not be found.',
					statusCode: 404,

				});
			}
			const guildMember = await guild.members.fetch(userId);
			if (!guildMember) {
				return res.code(403).send({
					error: 'Forbidden',
					message: 'You are not permitted for this action.',
					statusCode: 403,

				});
			}
		} catch (err) {
			// usually "Unknown Member": the user isn't in this guild
			client.log.verbose.http(err);
			return res.code(403).send({
				error: 'Forbidden',
				message: 'You are not permitted for this action.',
				statusCode: 403,
			});
		}
	});

	// 2: Manage Server, 3: the server's owner (see users.js getPrivilegeLevel; bot supers are above both)
	const requirePrivilege = level => async (req, res) => {
		try {
			const userId = req.user.id;
			const guildId = req.params.guild;
			const guild = client.guilds.cache.get(guildId);
			if (!guild) {
				return res.code(404).send({
					error: 'Not Found',
					message: 'The requested resource could not be found.',
					statusCode: 404,

				});
			}
			if (client.banned_guilds.has(guildId)) {
				return res.code(451).send({
					error: 'Unavailable For Legal Reasons',
					message: 'This guild has been banned for breaking the terms of service.',
					statusCode: 451,
				});
			}
			if (!req.user.service && !req.user.scopes?.includes('applications.commands.permissions.update')) {
				return res.code(401).send({
					elevate: 'admin',
					error: 'Unauthorised',
					message: 'Extra scopes required; reauthenticate.',
					statusCode: 401,
				});
			}
			const guildMember = await guild.members.fetch(userId);
			if (await getPrivilegeLevel(guildMember) < level) {
				return res.code(403).send({
					error: 'Forbidden',
					message: level >= 3 ? 'Only the server\'s owner can do this.' : 'You are not permitted for this action.',
					statusCode: 403,

				});
			}
		} catch (err) {
			// usually "Unknown Member": the user isn't in this guild
			client.log.verbose.http(err);
			return res.code(403).send({
				error: 'Forbidden',
				message: 'You are not permitted for this action.',
				statusCode: 403,
			});
		}
	};
	fastify.decorate('isAdmin', requirePrivilege(2));
	// exports hold every ticket's messages, including who wrote anonymous staff messages, and imports replace
	// everything, so they're for the server's owner only
	fastify.decorate('isOwner', requirePrivilege(3));

	// body processing
	fastify.addHook('preHandler', (req, res, done) => {
		if (req.body && typeof req.body === 'object') {
			for (const prop in req.body) {
				if (typeof req.body[prop] === 'string') {
					req.body[prop] = req.body[prop].trim();
				}
			}
		}
		done();
	});

	// logging
	fastify.addHook('onResponse', (req, res, done) => {
		const status = (res.statusCode >= 500
			? '&4'
			: res.statusCode >= 400
				? '&6'
				: res.statusCode >= 300
					? '&3'
					: res.statusCode >= 200
						? '&2'
						: '&f') + res.statusCode;
		let responseTime = res.elapsedTime.toFixed(2);
		responseTime = (responseTime >= 100
			? '&c'
			: responseTime >= 10
				? '&e'
				: '&a') + responseTime + 'ms';
		const level = req.routeOptions.url === '/status'
			? 'debug'
			: req.routeOptions.url === '/*'
				? 'verbose'
				: 'info';
		client.log[level].http(
			format(
				short(`${req.id} ${req.ip} ${req.method} %s &m-+>&r ${status}&b in ${responseTime}`),
				req.url,
			),
		);
		done();
	});

	fastify.addHook('onError', async (req, res, err) => client.log.error.http(req.id, err));

	// route loading
	const dir = join(__dirname, '../../routes');
	files(dir, {
		exclude: /^\./,
		match: /.js$/,
		sync: true,
	}).forEach(file => {
		const path = file
			.substring(0, file.length - 3) // remove `.js`
			.substring(dir.length) // remove higher directories
			.replace(/\\/g, '/') // replace `\` with `/` because Windows is stupid
			.replace(/\[(\w+)\]/gi, ':$1') // convert [] to :
			.replace('/index', '') || '/'; // remove index
		const route = require(file);

		Object.keys(route).forEach(method => fastify.route({
			config: { client },
			method: method.toUpperCase(),
			path,
			...route[method](fastify),
		})); // register route
	});

	return fastify;
};
