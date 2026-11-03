/**
 * The webhook secret is write-only: it's stored encrypted and never sent back to the dashboard, the log
 * channel or exports.
 */

const MASK = '********';

/**
 * Hide the webhook secret in settings that are about to leave the bot.
 * @param {object} settings
 * @returns {object} a copy
 */
function maskWebhookSecret(settings) {
	if (!settings || !('webhookSecret' in settings)) return settings;
	return {
		...settings,
		webhookSecret: settings.webhookSecret ? MASK : null,
	};
}

/**
 * Prepare a sanitised settings update: an unchanged (masked) secret is dropped, a new one is encrypted.
 * @param {object} data
 * @param {(text: string) => Promise<string>} encrypt
 * @returns {Promise<object>} data
 */
async function prepareWebhookSecret(data, encrypt) {
	if (data.webhookSecret === MASK || data.webhookSecret === undefined) delete data.webhookSecret;
	else if (data.webhookSecret) data.webhookSecret = await encrypt(data.webhookSecret);
	return data;
}

module.exports = {
	MASK,
	maskWebhookSecret,
	prepareWebhookSecret,
};
