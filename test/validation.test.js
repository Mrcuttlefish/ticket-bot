const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	ValidationError,
	sanitize,
	sanitizeCategory,
	schemas,
} = require('../src/lib/validation');

const ROLE = '451745464480432129';

test('sanitize drops relation writes and foreign keys', () => {
	const out = sanitize({
		archive: false,
		categories: { connect: { id: 1 } },
		createdAt: '2020-01-01',
		id: '1',
		tags: { deleteMany: {} },
		tickets: { connect: [{ id: '123' }] },
	}, schemas.guildSettings);
	assert.deepEqual(out, { archive: false });
});

test('sanitize validates types', () => {
	assert.throws(() => sanitize({ archive: { set: true } }, schemas.guildSettings), ValidationError);
	assert.throws(() => sanitize({ logChannel: { connect: {} } }, schemas.guildSettings), ValidationError);
	assert.throws(() => sanitize({ blocklist: ['not-an-id'] }, schemas.guildSettings), ValidationError);
	assert.throws(() => sanitize({ autoClose: 2 ** 31 * 1000 }, schemas.guildSettings), ValidationError);
	assert.throws(() => sanitize(null, schemas.guildSettings), ValidationError);
});

test('sanitize coerces form-style values and allows clearing nullable fields', () => {
	assert.deepEqual(sanitize({
		autoClose: '3600000',
		claimButton: 'true',
		footer: '',
		logChannel: null,
	}, schemas.guildSettings), {
		autoClose: 3600000,
		claimButton: true,
		footer: null,
		logChannel: null,
	});
});

test('autoTag accepts keywords or channel IDs', () => {
	assert.deepEqual(sanitize({ autoTag: 'ticket' }, schemas.guildSettings), { autoTag: 'ticket' });
	assert.deepEqual(sanitize({ autoTag: [ROLE] }, schemas.guildSettings), { autoTag: [ROLE] });
	assert.throws(() => sanitize({ autoTag: 'everything' }, schemas.guildSettings), ValidationError);
});

test('workingHours must be [timezone, ...7 days]', () => {
	const day = ['09:00', '17:00'];
	const valid = ['Europe/London', day, day, day, day, day, day, day];
	assert.deepEqual(sanitize({ workingHours: valid }, schemas.guildSettings), { workingHours: valid });
	assert.throws(() => sanitize({ workingHours: ['UTC'] }, schemas.guildSettings), ValidationError);
	assert.throws(() => sanitize({ workingHours: ['UTC', day, day, day, day, day, day, ['x', 'y']] }, schemas.guildSettings), ValidationError);
});

test('sanitizeCategory strips guild moves and nested ticket writes', () => {
	const {
		data, questions,
	} = sanitizeCategory({
		guild: { connect: { id: '1' } },
		guildId: '2',
		name: 'Support',
		questions: [{
			categoryId: 99,
			id: 'abc',
			label: 'Why?',
			order: 0,
			type: 'TEXT',
		}],
		staffRoles: [ROLE],
		tickets: { connect: { id: '3' } },
	});
	assert.deepEqual(data, {
		name: 'Support',
		staffRoles: [ROLE],
	});
	assert.deepEqual(questions, [{
		id: 'abc',
		label: 'Why?',
		order: 0,
		type: 'TEXT',
	}]);
});

test('sanitizeCategory rejects bad question types', () => {
	assert.throws(() => sanitizeCategory({ questions: [{ type: 'EVIL' }] }), ValidationError);
	assert.throws(() => sanitizeCategory({ questions: 'x' }), ValidationError);
});

test('validation errors become 400 responses', () => {
	const error = new ValidationError('x', 'bad');
	assert.equal(error.statusCode, 400);
});

test('new ticket options are validated', () => {
	const settings = sanitize({
		closeRequests: false,
		ghostPing: 'true',
		holidays: ['2026-12-25'],
		ticketNumberOffset: '1000',
	}, schemas.guildSettings);
	assert.deepEqual(settings, {
		closeRequests: false,
		ghostPing: true,
		holidays: ['2026-12-25'],
		ticketNumberOffset: 1000,
	});
	assert.throws(() => sanitize({ holidays: ['25/12/2026'] }, schemas.guildSettings), ValidationError);
	assert.throws(() => sanitize({ ticketNumberOffset: -1 }, schemas.guildSettings), ValidationError);

	const { data } = sanitizeCategory({
		fallbackCategories: ['123456789012345678'],
		pingRoleRules: [{
			extra: 'dropped',
			ping: ['123456789012345679'],
			roles: ['123456789012345680'],
		}],
		roleLimits: [{
			limit: '3',
			role: '123456789012345681',
		}],
	});
	assert.deepEqual(data.pingRoleRules, [{
		ping: ['123456789012345679'],
		roles: ['123456789012345680'],
	}]);
	assert.deepEqual(data.roleLimits, [{
		limit: 3,
		role: '123456789012345681',
	}]);
	assert.throws(() => sanitizeCategory({ roleLimits: [{ limit: 3 }] }), ValidationError);
	assert.throws(() => sanitizeCategory({ pingRoleRules: [{ ping: 'x' }] }), ValidationError);
	assert.throws(() => sanitizeCategory({ fallbackCategories: ['not-an-id'] }), ValidationError);
});

test('working hours accept null (or []) for days off, as the settings site sends', () => {
	const workingHours = ['Europe/London', null, ['09:00', '17:00'], ['09:00', '17:00'], ['09:00', '17:00'], ['09:00', '17:00'], ['09:00', '17:00'], []];
	assert.deepEqual(sanitize({ workingHours }, schemas.guildSettings).workingHours, ['Europe/London', null, ['09:00', '17:00'], ['09:00', '17:00'], ['09:00', '17:00'], ['09:00', '17:00'], ['09:00', '17:00'], null]);
	assert.throws(() => sanitize({ workingHours: ['UTC', '9-5', null, null, null, null, null, null] }, schemas.guildSettings), ValidationError);
	assert.throws(() => sanitize({ workingHours: ['UTC', null] }, schemas.guildSettings), ValidationError);
});
