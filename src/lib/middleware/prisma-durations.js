/**
 * Durations are stored in seconds but used in milliseconds everywhere else (bot, API, exports).
 *
 * They used to be stored in milliseconds in 32-bit INT columns, which capped them at ~24 days,
 * so values like "30d" failed to save or broke reads (upstream #530, #673). Storing seconds raises
 * the limit to ~68 years without changing the column type. The `durations_in_seconds` migration
 * converts existing rows.
 *
 * This middleware converts at the database boundary so nothing else needs to know:
 * - arguments (data, where): milliseconds -> seconds
 * - results: seconds -> milliseconds
 */

const FIELDS = new Set(['autoClose', 'cooldown', 'staleAfter']);
const MAX_SECONDS = 2 ** 31 - 1;

const toSeconds = ms => {
	if (typeof ms !== 'number' || !Number.isFinite(ms)) return ms;
	if (ms <= 0) return 0;
	return Math.min(Math.max(1, Math.round(ms / 1000)), MAX_SECONDS);
};

const toMilliseconds = s => (typeof s === 'number' ? s * 1000 : s);

/**
 * Convert a duration value or a filter/update operator object (e.g. `{ gte: 1000 }`, `{ set: 1000 }`).
 * @param {*} value
 * @param {(n: number) => number} convert
 * @returns {*}
 */
function convertValue(value, convert) {
	if (typeof value === 'number') return convert(value);
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		const out = {};
		for (const [k, v] of Object.entries(value)) out[k] = typeof v === 'number' ? convert(v) : v;
		return out;
	}
	return value;
}

/**
 * Walk an object (args or results), converting duration fields in place.
 * @param {*} obj
 * @param {(n: number) => number} convert
 * @param {WeakSet} [seen]
 */
function walk(obj, convert, seen = new WeakSet()) {
	if (!obj || typeof obj !== 'object' || obj instanceof Date || seen.has(obj)) return;
	seen.add(obj);
	if (Array.isArray(obj)) {
		for (const item of obj) walk(item, convert, seen);
		return;
	}
	for (const key of Object.keys(obj)) {
		if (FIELDS.has(key)) {
			obj[key] = convertValue(obj[key], convert);
		} else if (key !== 'select' && key !== 'include' && key !== 'orderBy') {
			// `select: { autoClose: true }` must not be touched
			walk(obj[key], convert, seen);
		} else if (key === 'include' || key === 'select') {
			// nested includes may contain `where` filters on related models
			for (const nested of Object.values(obj[key] ?? {})) {
				if (nested && typeof nested === 'object') walk(nested, convert, seen);
			}
		}
	}
}

/** @type {import('@prisma/client').Prisma.Middleware} */
module.exports = async (params, next) => {
	if (params.args) walk(params.args, toSeconds);
	const result = await next(params);
	walk(result, toMilliseconds);
	return result;
};

module.exports.toMilliseconds = toMilliseconds;
module.exports.toSeconds = toSeconds;
module.exports.walk = walk;
