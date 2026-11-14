const { API_KEY_LIFETIME } = require('../../../../lib/jwt-secret');

module.exports.get = fastify => ({
	handler: async function (req, res) { // MUST NOT use arrow function syntax
		if (req.user.service) {
			// an API key can't make another one, or a leaked key could be renewed forever
			return res.code(403).send({
				error: 'Forbidden',
				message: 'Log in to the dashboard to create an API key.',
				statusCode: 403,
			});
		} else if (process.env.PUBLIC_BOT === 'true') {
			return res.code(400).send({
				error: 'Bad Request',
				message: 'API keys are not available on public bots.',
				statusCode: 400,
			});
		} else {
			return {
				token: this.jwt.sign({
					createdAt: Date.now(),
					expiresAt: Date.now() + API_KEY_LIFETIME, // S11
					id: req.user.id,
					service: true,
				}),
			};
		}
	},
	onRequest: [fastify.authenticate],
});
