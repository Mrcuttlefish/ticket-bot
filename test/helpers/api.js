/**
 * The real HTTP API (src/lib/http/app.js) for integration tests, with a signed-in user.
 * Requests go through the real authentication, admin checks, validation and error handling.
 */

const buildApp = require('../../src/lib/http/app');

/**
 * @param {object} client a test client
 * @returns {Promise<{ app: import('fastify').FastifyInstance, as: (userId: string, claims?: object) => Function }>}
 */
async function createTestAPI(client) {
	client.banned_guilds ??= new Set();
	const app = await buildApp(client);
	await app.ready();

	/**
	 * Make requests as a user. Admin routes need the scope that dashboard logins request.
	 * @param {string} userId
	 * @param {object} [claims]
	 */
	const as = (userId, claims = {}) => {
		const token = app.jwt.sign({
			createdAt: Date.now(),
			expiresAt: Date.now() + 60e3,
			id: userId,
			scopes: ['identify', 'guilds', 'applications.commands.permissions.update'],
			...claims,
		});
		return async (method, url, body) => {
			const response = await app.inject({
				headers: { authorization: `Bearer ${token}` },
				method,
				payload: body,
				url,
			});
			let json;
			try {
				json = response.json();
			} catch {
				json = undefined;
			}
			return {
				body: json,
				status: response.statusCode,
				text: response.body,
			};
		};
	};

	return {
		app,
		as,
	};
}

module.exports = { createTestAPI };
