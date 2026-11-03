const { hkdfSync } = require('node:crypto');

/**
 * The key that signs login tokens and API keys (audit finding S10).
 *
 * ENCRYPTION_KEY also encrypts ticket data, so it isn't used directly. A separate key is derived from it
 * with HKDF, so a weakness in one use (e.g. an offline brute-force attempt against a token) doesn't involve
 * the key that protects the data. Changing this logs everyone out once.
 * @param {string} encryptionKey
 * @returns {Buffer}
 */
function getJWTSecret(encryptionKey) {
	if (!encryptionKey) throw new Error('ENCRYPTION_KEY is required');
	return Buffer.from(hkdfSync('sha256', encryptionKey, 'discord-tickets', 'jwt-signing-key', 32));
}

// API keys used to never expire (audit finding S11)
const API_KEY_LIFETIME = 365 * 24 * 60 * 60 * 1000;

/**
 * Whether a verified token's claims are still valid. Every token must expire: API keys made before S11 was
 * fixed have no expiry (they also have the old signature, so they fail verification anyway).
 * @param {{ expiresAt?: number, createdAt?: number }} data
 * @param {string} [invalidateBefore] INVALIDATE_TOKENS
 * @param {number} [now]
 * @returns {boolean}
 */
function isTokenCurrent(data, invalidateBefore, now = Date.now()) {
	if (typeof data?.expiresAt !== 'number' || data.expiresAt < now) return false;
	if (invalidateBefore && data.createdAt < new Date(invalidateBefore).getTime()) return false;
	return true;
}

module.exports = {
	API_KEY_LIFETIME,
	isTokenCurrent,
	getJWTSecret,
};
