module.exports.get = fastify => ({
	handler: req => {
		// don't expose the Discord access token to browser scripts
		const {
			accessToken: _accessToken,
			...user
		} = req.user;
		return user;
	},
	onRequest: [fastify.authenticate],
});
