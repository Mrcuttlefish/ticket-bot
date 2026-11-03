const { expose } = require('threads/worker');
const { encrypt } = require('../crypto');
const { importTicket } = require('../import');

expose({
	importTicket(stringified, guildId, categoryMap) {
		return importTicket(JSON.parse(stringified), guildId, categoryMap, encrypt);
	},
});
