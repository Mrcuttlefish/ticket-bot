/**
 * Outgoing webhooks for ticket events (upstream #474).
 *
 * The URL is set by guild admins, who aren't necessarily the bot's host, so requests are protected
 * against server-side request forgery: HTTPS only, no redirects, a short timeout, and the address
 * that is actually connected to (after DNS resolution) must be public. Self-hosters can allow
 * plain HTTP and private addresses with WEBHOOKS_ALLOW_PRIVATE=true.
 */

const dns = require('node:dns');
const https = require('node:https');
const http = require('node:http');
const net = require('node:net');
const { createHmac } = require('node:crypto');

const TIMEOUT = 5e3;
const MAX_URL_LENGTH = 2048;

const blockList = new net.BlockList();
// IPv4
for (const [address, prefix] of [
	['0.0.0.0', 8], // "this" network
	['10.0.0.0', 8], // private
	['100.64.0.0', 10], // carrier-grade NAT
	['127.0.0.0', 8], // loopback
	['169.254.0.0', 16], // link-local (includes cloud metadata services)
	['172.16.0.0', 12], // private
	['192.0.0.0', 24], // IETF protocol assignments
	['192.0.2.0', 24], // documentation
	['192.168.0.0', 16], // private
	['198.18.0.0', 15], // benchmarking
	['198.51.100.0', 24], // documentation
	['203.0.113.0', 24], // documentation
	['224.0.0.0', 4], // multicast
	['240.0.0.0', 4], // reserved and broadcast
]) blockList.addSubnet(address, prefix, 'ipv4');
// IPv6
for (const [address, prefix] of [
	['::', 96], // unspecified, loopback and deprecated IPv4-compatible addresses
	['64:ff9b::', 96], // NAT64
	['100::', 64], // discard
	['2001:db8::', 32], // documentation
	['fc00::', 7], // unique local
	['fe80::', 10], // link-local
	['ff00::', 8], // multicast
]) blockList.addSubnet(address, prefix, 'ipv6');

const allowPrivate = () => process.env.WEBHOOKS_ALLOW_PRIVATE === 'true';

/**
 * @param {string} address an IP address
 * @returns {boolean}
 */
function isPublicAddress(address) {
	const family = net.isIP(address);
	if (family === 0) return false;
	if (family === 6) {
		// IPv4-mapped addresses (::ffff:a.b.c.d, or ::ffff:abcd:ef01 once normalised) are checked as IPv4
		const normalised = new URL(`http://[${address}]`).hostname.slice(1, -1);
		const mapped = normalised.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
		if (mapped) {
			const [high, low] = [parseInt(mapped[1], 16), parseInt(mapped[2], 16)];
			return isPublicAddress(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
		}
		return !blockList.check(address, 'ipv6');
	}
	return !blockList.check(address, 'ipv4');
}

/**
 * Check a webhook URL when it's saved.
 * @param {string} value
 * @returns {{ ok: true, url: URL } | { ok: false, reason: string }}
 */
function checkWebhookURL(value) {
	if (typeof value !== 'string' || value.length > MAX_URL_LENGTH) {
		return {
			ok: false,
			reason: `must be a URL of at most ${MAX_URL_LENGTH} characters`,
		};
	}
	let url;
	try {
		url = new URL(value);
	} catch {
		return {
			ok: false,
			reason: 'must be a valid URL',
		};
	}
	if (url.protocol !== 'https:' && !(allowPrivate() && url.protocol === 'http:')) {
		return {
			ok: false,
			reason: 'must use HTTPS',
		};
	}
	if (url.username || url.password) {
		return {
			ok: false,
			reason: 'must not contain credentials',
		};
	}
	const host = url.hostname.replace(/^\[|\]$/g, '');
	if (!allowPrivate() && (host === 'localhost' || host.endsWith('.localhost') || (net.isIP(host) && !isPublicAddress(host)))) {
		return {
			ok: false,
			reason: 'must not point to a private address',
		};
	}
	return {
		ok: true,
		url,
	};
}

/**
 * A DNS lookup that refuses private addresses, so the check applies to the address actually connected to
 * (this prevents DNS rebinding between a check and the request).
 */
function safeLookup(hostname, options, callback) {
	dns.lookup(hostname, {
		...options,
		all: true,
	}, (error, addresses) => {
		if (error) return callback(error);
		const allowed = allowPrivate() ? addresses : addresses.filter(a => isPublicAddress(a.address));
		if (allowed.length === 0) {
			const blocked = new Error(`Webhook host ${hostname} resolves to a private address`);
			blocked.code = 'EWEBHOOKBLOCKED';
			return callback(blocked);
		}
		if (options.all) return callback(null, allowed);
		return callback(null, allowed[0].address, allowed[0].family);
	});
}

/**
 * @param {string} body
 * @param {string} secret
 * @returns {string}
 */
function sign(body, secret) {
	return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
}

/**
 * POST a JSON payload to a webhook.
 * @param {string} target
 * @param {object} payload
 * @param {string | null} [secret] signs the body with HMAC-SHA256 in the `X-Signature-256` header
 * @returns {Promise<number>} the response status code
 */
function sendWebhook(target, payload, secret) {
	const checked = checkWebhookURL(target);
	if (!checked.ok) return Promise.reject(new Error(`Invalid webhook URL: ${checked.reason}`));
	const { url } = checked;
	const body = JSON.stringify(payload);
	const headers = {
		'Content-Length': Buffer.byteLength(body),
		'Content-Type': 'application/json',
		'User-Agent': 'discord-tickets-webhook',
	};
	if (secret) headers['X-Signature-256'] = sign(body, secret);

	return new Promise((resolve, reject) => {
		const request = (url.protocol === 'https:' ? https : http).request(url, {
			headers,
			lookup: safeLookup,
			method: 'POST',
			timeout: TIMEOUT,
		}, response => {
			response.resume(); // the response body isn't needed, and redirects aren't followed
			response.on('end', () => resolve(response.statusCode));
			response.on('error', reject);
		});
		request.on('timeout', () => request.destroy(new Error('Webhook request timed out')));
		request.on('error', reject);
		request.end(body);
	});
}

module.exports = {
	checkWebhookURL,
	isPublicAddress,
	safeLookup,
	sendWebhook,
	sign,
};
