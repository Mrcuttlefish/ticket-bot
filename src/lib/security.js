/**
 * Small, dependency-free helpers for handling untrusted input.
 */

/**
 * Is `path` a same-origin relative path that is safe to redirect to?
 * Rejects protocol-relative URLs (`//evil.com`) and the backslash variant (`/\evil.com`),
 * which browsers normalise to `//evil.com`.
 * @param {unknown} path
 * @returns {boolean}
 */
function isSafeRedirect(path) {
	if (typeof path !== 'string' || path.length === 0 || path.length > 2048) return false;
	if (path[0] !== '/') return false;
	if (path[1] === '/' || path[1] === '\\') return false;
	// no backslashes, whitespace, control characters, or characters that could break out of an HTML attribute
	// eslint-disable-next-line no-control-regex
	if (/[\\\s\x00-\x1f\x7f'"<>`]/.test(path)) return false;
	return true;
}

/**
 * Escape a string so it matches literally inside a RegExp.
 * @param {string} string
 * @returns {string}
 */
const escapeRegExp = string => String(string).replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');

/**
 * Case-insensitive substring match for user-typed search text (e.g. autocomplete).
 * Never compiles user input as a regular expression.
 * @param {string} haystack
 * @param {string} needle
 * @returns {boolean}
 */
const includesIgnoreCase = (haystack, needle) => String(haystack ?? '').toLowerCase().includes(String(needle ?? '').toLowerCase());

/**
 * Escape text for safe inclusion in HTML.
 * @param {unknown} string
 * @returns {string}
 */
const escapeHTML = string => String(string)
	.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;')
	.replace(/"/g, '&quot;')
	.replace(/'/g, '&#39;');

/**
 * Check an admin-supplied tag pattern before it is stored or executed.
 * Rejects invalid patterns, back-references and nested quantifiers such as `(a+)+`,
 * the usual cause of catastrophic backtracking.
 * @param {string} pattern
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
function checkTagRegex(pattern) {
	if (typeof pattern !== 'string') {
		return {
			ok: false,
			reason: 'not a string',
		};
	}
	if (pattern.length > 200) {
		return {
			ok: false,
			reason: 'pattern is longer than 200 characters',
		};
	}
	try {
		new RegExp(pattern, 'mi');
	} catch (error) {
		return {
			ok: false,
			reason: error.message,
		};
	}
	if (/\\[1-9]|\\k</.test(pattern)) {
		return {
			ok: false,
			reason: 'back-references are not allowed',
		};
	}

	// walk the pattern, tracking whether each open group contains a quantifier
	const stack = [{ quantified: false }];
	const isQuantifier = (p, i) => {
		const c = p[i];
		if (c === '*' || c === '+') return true;
		if (c === '{') return /^\{\d+(,\d*)?\}/.test(p.slice(i));
		return false;
	};
	let inClass = false;
	for (let i = 0; i < pattern.length; i++) {
		const c = pattern[i];
		if (c === '\\') {
			i++;
			continue;
		}
		if (inClass) {
			if (c === ']') inClass = false;
			continue;
		}
		if (c === '[') {
			inClass = true;
			continue;
		}
		if (c === '(') {
			stack.push({ quantified: false });
			continue;
		}
		if (c === ')') {
			const group = stack.length > 1 ? stack.pop() : { quantified: false };
			if (isQuantifier(pattern, i + 1)) {
				if (group.quantified) {
					return {
						ok: false,
						reason: 'nested quantifiers (like "(a+)+") can freeze the bot',
					};
				}
				stack[stack.length - 1].quantified = true;
			} else if (group.quantified) {
				stack[stack.length - 1].quantified = true;
			}
			continue;
		}
		if (isQuantifier(pattern, i)) stack[stack.length - 1].quantified = true;
	}
	return { ok: true };
}

/**
 * Compile a stored tag pattern, returning null (instead of throwing) if it is unusable.
 * Patterns stored before validation existed may be invalid or dangerous.
 * @param {string} pattern
 * @returns {RegExp | null}
 */
function compileTagRegex(pattern) {
	if (!pattern || !checkTagRegex(pattern).ok) return null;
	return new RegExp(pattern, 'mi');
}

module.exports = {
	checkTagRegex,
	compileTagRegex,
	escapeHTML,
	escapeRegExp,
	includesIgnoreCase,
	isSafeRedirect,
};
