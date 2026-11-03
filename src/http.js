const buildApp = require('./lib/http/app');

process.env.ORIGIN = process.env.HTTP_INTERNAL || process.env.HTTP_EXTERNAL;

module.exports = async client => {
	const fastify = await buildApp(client);

	const { handler } = await import('@discord-tickets/settings/build/handler.js');

	// https://stackoverflow.com/questions/72317071/how-to-set-up-fastify-correctly-so-that-sveltekit-works-fine
	fastify.all('/*', {}, (req, res) => handler(req.raw, res.raw, () => {
	}));

	// start the fastify server
	fastify.listen({
		host: process.env.HTTP_HOST,
		port: process.env.HTTP_PORT,
	}, (err, addr) => {
		if (err) {
			client.log.error.http(err);
		} else {
			client.log.success.http(`Listening at ${addr}`);
		}
	});

	process.on('sveltekit:error', ({
		error,
		errorId,
	}) => {
		client.log.error.http(`SvelteKit ${errorId} ${error}`);
	});
};
