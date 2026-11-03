const spacetime = require('spacetime');

/**
 * Work out whether staff are currently working.
 *
 * Fixes upstream #452, #476 and #529: the old code `shift()`ed the timezone off the cached
 * settings array (so every ticket after the first read the wrong day, and eventually `undefined`),
 * and treated `findIndex` results of `0` (Sunday) and `-1` (not found) the wrong way round.
 *
 * @param {[string, ...[string, string][]]} workingHours `[timezone, sunday, monday, ..., saturday]`
 * @param {import('spacetime').Spacetime} [now]
 * @param {string[]} [holidays] dates (`YYYY-MM-DD`, in the working hours timezone) when staff aren't working (upstream #403)
 * @returns {{ working: boolean, holiday?: boolean, startsToday?: boolean, timestamp?: number | null }}
 * `timestamp` is when staff next start work, in Unix seconds (null if no working days are set)
 */
function getWorkingStatus(workingHours, now, holidays = []) {
	if (!Array.isArray(workingHours) || workingHours.length !== 8) return { working: true };
	const [timezone, ...days] = workingHours; // never mutate the (cached) settings
	try {
		now ??= spacetime.now(timezone);
		if (timezone && now.timezone().name !== timezone) now = now.goto(timezone);
	} catch {
		now ??= spacetime.now('UTC');
	}

	const isWorkingDay = hours => Array.isArray(hours) && hours[0] !== hours[1];
	const holidaySet = new Set(Array.isArray(holidays) ? holidays : []);
	const isHoliday = date => holidaySet.has(date.format('iso-short'));
	const today = now.day();
	const currentHours = days[today];
	const holiday = isHoliday(now);

	if (!holiday && isWorkingDay(currentHours)) {
		const start = now.time(currentHours[0]);
		const end = now.time(currentHours[1]).add(59, 'second'); // "17:00" includes 17:00:xx
		if (now.isBefore(start)) {
			return {
				startsToday: true,
				timestamp: Math.ceil(start.epoch / 1000),
				working: false,
			};
		}
		if (!now.isAfter(end)) return { working: true };
	}

	// find the next working day that isn't a holiday; a week ahead normally (the same weekday next week counts),
	// but further if there are holidays, up to a year
	const maxOffset = holidaySet.size > 0 ? 366 : 7;
	for (let offset = 1; offset <= maxOffset; offset++) {
		const index = (today + offset) % 7;
		if (!isWorkingDay(days[index])) continue;
		const day = now.add(offset, 'day');
		if (isHoliday(day)) continue;
		return {
			...(holiday && { holiday }),
			startsToday: false,
			timestamp: Math.ceil(day.time(days[index][0]).epoch / 1000),
			working: false,
		};
	}

	return {
		...(holiday && { holiday }),
		startsToday: false,
		timestamp: null,
		working: false,
	};
}

module.exports = { getWorkingStatus };
