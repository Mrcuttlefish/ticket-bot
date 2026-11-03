const { test } = require('node:test');
const assert = require('node:assert/strict');
const { findSuggestedTags } = require('../../src/lib/tickets/tag-suggestions');

const tags = [
	{
		name: 'faq',
		regex: null,
	},
	{
		name: 'refunds',
		regex: 'refund',
	},
	{
		name: 'refund-status',
		regex: 'refund (status|update)',
	},
	{
		name: 'Shipping',
		regex: null,
	},
	{
		name: 'broken',
		regex: '(a+)+$',
	},
	{
		name: 'Two Factor',
		regex: null,
	},
];
const names = text => findSuggestedTags(tags, text).map(t => t.name);

test('findSuggestedTags: longer patterns first, then names', () => {
	assert.deepEqual(names('what is my refund status? and shipping'), ['refund-status', 'refunds', 'Shipping']);
});

test('findSuggestedTags: names match as whole words or phrases, ignoring case', () => {
	assert.deepEqual(names('SHIPPING!'), ['Shipping']);
	assert.deepEqual(names('reshipping'), []);
	assert.deepEqual(names('my two factor code'), ['Two Factor']);
	assert.deepEqual(names('faq'), ['faq']);
});

test('findSuggestedTags: unsafe patterns are skipped, and empty text matches nothing', () => {
	assert.deepEqual(names('aaaaaaaaaaaaaaaaaaaaaaaaaaaab'), []);
	assert.deepEqual(names(''), []);
	assert.deepEqual(findSuggestedTags(tags, null), []);
});

test('findSuggestedTags: at most three', () => {
	assert.equal(findSuggestedTags(tags, 'refund status shipping faq two factor').length, 3);
});
