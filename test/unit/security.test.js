const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	checkTagRegex,
	compileTagRegex,
	escapeHTML,
	includesIgnoreCase,
	isSafeRedirect,
} = require('../../src/lib/security');

test('isSafeRedirect accepts same-origin paths', () => {
	for (const path of ['/', '/settings', '/settings/123/categories/4?x=1#y']) {
		assert.equal(isSafeRedirect(path), true, path);
	}
});

test('isSafeRedirect rejects open redirects and attribute breakouts', () => {
	for (const path of [
		'//evil.com',
		'/\\evil.com',
		'/\\/evil.com',
		'/a\\b',
		'https://evil.com',
		'evil.com',
		'',
		'/ x',
		'/\tx',
		'/x\'onload=alert(1)',
		'/x"><script>',
		undefined,
		null,
		['/'],
	]) {
		assert.equal(isSafeRedirect(path), false, String(path));
	}
});

test('includesIgnoreCase never treats input as a pattern', () => {
	assert.equal(includesIgnoreCase('Support #12', 'support'), true);
	assert.equal(includesIgnoreCase('abc', '(a+)+$'), false);
	assert.equal(includesIgnoreCase('abc', '['), false); // would throw as a RegExp
	assert.equal(includesIgnoreCase('a.c', '.'), true);
	assert.equal(includesIgnoreCase(undefined, 'x'), false);
});

test('escapeHTML escapes markup', () => {
	assert.equal(escapeHTML('<img src=x onerror="a">&\''), '&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;');
});

test('checkTagRegex accepts ordinary patterns', () => {
	for (const pattern of ['^how do i', 'refund|money back', '\\bapply\\b', 'colou?r', 'a{2,3}', '(foo|bar)+', '[a-z]+ (?:ticket)']) {
		assert.deepEqual(checkTagRegex(pattern), { ok: true }, pattern);
	}
});

test('checkTagRegex rejects invalid and catastrophic patterns', () => {
	for (const pattern of ['(a+)+$', '(a*)*b', '((ab)+)+', '(a+){2,}', '(x+x+)+y', '(\\w+\\s?)*$', '(', '(a)\\1', 'a'.repeat(201)]) {
		assert.equal(checkTagRegex(pattern).ok, false, pattern);
	}
});

test('compileTagRegex skips unsafe stored patterns instead of throwing', () => {
	assert.equal(compileTagRegex('(a+)+$'), null);
	assert.equal(compileTagRegex('['), null);
	assert.equal(compileTagRegex(null), null);
	assert.equal(compileTagRegex('^HELLO').test('hello there'), true);
});
