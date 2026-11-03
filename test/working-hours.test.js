const { test } = require('node:test');
const assert = require('node:assert/strict');
const spacetime = require('spacetime');
const { getWorkingStatus } = require('../src/lib/tickets/working-hours');

const NINE_TO_FIVE = ['09:00', '17:00'];
const OFF = ['00:00', '00:00'];
// [timezone, sun, mon, tue, wed, thu, fri, sat]
const weekdays = tz => [tz, OFF, NINE_TO_FIVE, NINE_TO_FIVE, NINE_TO_FIVE, NINE_TO_FIVE, NINE_TO_FIVE, OFF];
const at = (iso, tz = 'Europe/London') => spacetime(iso, tz);
const unix = (iso, tz = 'Europe/London') => Math.ceil(spacetime(iso, tz).epoch / 1000);

test('default 00:00-23:59 every day is always working', () => {
	const allDay = ['UTC', ...Array(7).fill(['00:00', '23:59'])];
	assert.deepEqual(getWorkingStatus(allDay, at('2026-11-03T23:59:30', 'UTC')), { working: true });
	assert.deepEqual(getWorkingStatus(allDay, at('2026-11-01T00:00:00', 'UTC')), { working: true });
});

test('within hours on a weekday', () => {
	assert.deepEqual(getWorkingStatus(weekdays('Europe/London'), at('2026-11-03T10:30:00')), { working: true }); // Tuesday
});

test('before hours points to later today', () => {
	const status = getWorkingStatus(weekdays('Europe/London'), at('2026-11-03T07:00:00'));
	assert.deepEqual(status, {
		startsToday: true,
		timestamp: unix('2026-11-03T09:00:00'),
		working: false,
	});
});

test('after hours points to the next working day', () => {
	const status = getWorkingStatus(weekdays('Europe/London'), at('2026-11-03T18:00:00'));
	assert.deepEqual(status, {
		startsToday: false,
		timestamp: unix('2026-11-04T09:00:00'),
		working: false,
	});
});

test('Friday evening points to Monday, not Sunday (findIndex 0 bug)', () => {
	const status = getWorkingStatus(weekdays('Europe/London'), at('2026-11-06T18:00:00'));
	assert.equal(status.timestamp, unix('2026-11-09T09:00:00'));
});

test('Sunday-only staff are found (index 0)', () => {
	const sundays = ['UTC', NINE_TO_FIVE, OFF, OFF, OFF, OFF, OFF, OFF];
	const status = getWorkingStatus(sundays, at('2026-11-03T12:00:00', 'UTC'));
	assert.equal(status.timestamp, unix('2026-11-08T09:00:00', 'UTC'));
});

test('the same weekday next week is used when it is the only working day', () => {
	const tuesdays = ['UTC', OFF, OFF, NINE_TO_FIVE, OFF, OFF, OFF, OFF];
	const status = getWorkingStatus(tuesdays, at('2026-11-03T18:00:00', 'UTC'));
	assert.equal(status.timestamp, unix('2026-11-10T09:00:00', 'UTC'));
});

test('the settings array is not mutated (upstream #452, #529)', () => {
	const hours = weekdays('Europe/London');
	const copy = structuredClone(hours);
	for (let i = 0; i < 10; i++) getWorkingStatus(hours, at('2026-11-03T10:30:00'));
	assert.deepEqual(hours, copy);
});

test('no working days at all', () => {
	const none = ['UTC', ...Array(7).fill(OFF)];
	assert.deepEqual(getWorkingStatus(none, at('2026-11-03T10:00:00', 'UTC')), {
		startsToday: false,
		timestamp: null,
		working: false,
	});
});

test('the configured timezone is used, not the server timezone (upstream #476)', () => {
	// 08:30 in New York is 13:30 in London: working in New York, but 08:30 is before 09:00
	const status = getWorkingStatus(weekdays('America/New_York'), at('2026-11-03T13:30:00', 'Europe/London'));
	assert.equal(status.working, false);
	assert.equal(status.startsToday, true);
	assert.equal(status.timestamp, unix('2026-11-03T09:00:00', 'America/New_York'));
});

test('malformed settings fail open', () => {
	assert.deepEqual(getWorkingStatus(undefined), { working: true });
	assert.deepEqual(getWorkingStatus(['UTC']), { working: true });
});

test('holidays are not working days (upstream #403)', () => {
	// Tuesday 3rd is a holiday, so staff are back on Wednesday
	const status = getWorkingStatus(weekdays('Europe/London'), at('2026-11-03T10:30:00'), ['2026-11-03']);
	assert.deepEqual(status, {
		holiday: true,
		startsToday: false,
		timestamp: unix('2026-11-04T09:00:00'),
		working: false,
	});
});

test('holidays are skipped when finding the next working day', () => {
	// Friday evening, with Monday and Tuesday off: back on Wednesday
	const status = getWorkingStatus(weekdays('Europe/London'), at('2026-11-06T18:00:00'), ['2026-11-09', '2026-11-10']);
	assert.deepEqual(status, {
		startsToday: false,
		timestamp: unix('2026-11-11T09:00:00'),
		working: false,
	});
});

test('holiday dates use the working hours timezone', () => {
	// 23:30 on the 2nd in UTC is already the 3rd in Tokyo
	const status = getWorkingStatus(['Asia/Tokyo', ...Array(7).fill(['00:00', '23:59'])], at('2026-11-02T23:30:00', 'UTC'), ['2026-11-03']);
	assert.equal(status.working, false);
	assert.equal(status.holiday, true);
	assert.equal(status.timestamp, unix('2026-11-04T00:00:00', 'Asia/Tokyo'));
});

test('a holiday on a day off changes nothing', () => {
	assert.deepEqual(getWorkingStatus(weekdays('Europe/London'), at('2026-11-03T10:30:00'), ['2026-11-01']), { working: true });
});
