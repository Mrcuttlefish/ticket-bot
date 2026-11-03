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

test('menu questions: selection limits, defaults when editing, and reading answers (upstream #446)', () => {
	const {
		buildQuestionComponent, buildQuestionMenu, readAnswer,
	} = require('../../src/lib/tickets/question-input');
	const question = {
		id: 'platform',
		label: 'Platform',
		maxLength: 4000, // the text default; more than the number of options
		minLength: 0,
		options: [{ label: 'Web' }, {
			description: 'iPhone and iPad',
			label: 'iOS',
		}],
		required: true,
		type: 'MENU',
	};
	const menu = buildQuestionMenu(question, 'iOS').toJSON();
	assert.equal(menu.max_values, 2, 'at most the number of options');
	assert.equal(menu.min_values, 1, 'required menus need a choice');
	assert.deepEqual(menu.options.map(o => o.default), [false, true], 'the existing answer is selected');
	assert.equal(buildQuestionMenu({
		...question,
		required: false,
	}).toJSON().min_values, 0);

	const label = buildQuestionComponent(question).toJSON();
	assert.equal(label.type, 18);
	assert.equal(label.label, 'Platform');
	const text = buildQuestionComponent({
		id: 'order',
		label: 'Order',
		type: 'TEXT',
	}).toJSON();
	assert.equal(text.component.type, 4);
	assert.equal(text.component.label, undefined, 'inputs in a label have no label of their own');

	const fields = {
		getStringSelectValues: () => ['1', '0', '9'],
		getTextInputValue: () => 'ABC123',
	};
	assert.equal(readAnswer(fields, question), 'iOS\nWeb', 'unknown values are ignored');
	assert.equal(readAnswer(fields, {
		id: 'order',
		type: 'TEXT',
	}), 'ABC123');
	assert.equal(readAnswer({
		getStringSelectValues: () => {
			throw new Error('missing');
		},
	}, question), '');
});

test('menu options are validated', () => {
	const { sanitizeCategory } = require('../../src/lib/validation');
	const menu = options => sanitizeCategory({
		questions: [{
			label: 'Platform',
			options,
			type: 'MENU',
		}],
	});
	assert.deepEqual(menu([{
		extra: 'dropped',
		label: ' Web ',
	}]).questions[0].options, [{ label: 'Web' }]);
	assert.throws(() => menu([]), /at least one option/);
	assert.throws(() => menu([{ label: '' }]), /label/);
	assert.throws(() => menu([{ label: 'x'.repeat(101) }]), /label/);
	assert.throws(() => menu(Array.from({ length: 26 }, (_, i) => ({ label: String(i) }))), /25/);
	assert.throws(() => menu([{ label: 'Web' }, { label: 'Web' }]), /different/);
});
