const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TextInputStyle } = require('discord.js');
const {
	MAX_ANSWER_LENGTH, buildQuestionInput,
} = require('../../src/lib/tickets/question-input');

test('questions saved without optional fields still build (they used to throw)', () => {
	const input = buildQuestionInput({
		id: 'q1',
		label: 'Order number',
		maxLength: null,
		minLength: null,
		placeholder: null,
		required: true,
		style: 2,
		value: null,
	}).toJSON();
	assert.equal(input.custom_id, 'q1');
	assert.equal(input.max_length, MAX_ANSWER_LENGTH);
	assert.equal(input.min_length, 0);
	assert.equal(input.placeholder, undefined);
	assert.equal(input.style, TextInputStyle.Paragraph);
});

test('lengths are capped and the existing answer is the value', () => {
	const input = buildQuestionInput({
		id: 'q1',
		label: 'Details',
		maxLength: 4000,
		minLength: 2000,
		placeholder: 'Tell us more',
		required: false,
		style: TextInputStyle.Short,
		value: 'default',
	}, 'my answer', 42).toJSON();
	assert.equal(input.custom_id, '42');
	assert.equal(input.max_length, 1000);
	assert.equal(input.min_length, 1000);
	assert.equal(input.placeholder, 'Tell us more');
	assert.equal(input.required, false);
	assert.equal(input.style, TextInputStyle.Short);
	assert.equal(input.value, 'my answer');
	assert.equal(buildQuestionInput({
		id: 'q',
		label: 'L',
		value: 'default',
	}).toJSON().value, 'default');
});
