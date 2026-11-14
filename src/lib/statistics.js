/**
 * Statistics for the dashboard (Ticket Tool parity, P3): tickets opened and closed per day and per category, and
 * how many tickets each staff member claimed and closed, over the last `days` days (7 to 365, default 30).
 *
 * Tickets in anonymous categories are counted in the totals but never in the per-staff counts, so the statistics
 * can't be used to work out who answered them.
 */

const ms = require('ms');

const DAY = 24 * 60 * 60 * 1000;

const average = values => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
const dayKey = date => new Date(date).toISOString().slice(0, 10);

/**
 * @param {object[]} tickets
 * @param {object} options
 * @param {Map<number, { anonymous: boolean, name: string }>} options.categories
 * @param {number} options.days
 * @param {number} options.now
 */
function buildStatistics(tickets, {
	categories, days, now,
}) {
	const since = now - (days * DAY);
	const perDay = new Map();
	for (let i = days - 1; i >= 0; i--) {
		perDay.set(dayKey(now - (i * DAY)), {
			closed: 0,
			created: 0,
		});
	}
	const perCategory = new Map();
	const perStaff = new Map();
	const responseTimes = [];
	const resolutionTimes = [];
	const ratings = [];
	let created = 0;
	let closed = 0;
	const staff = id => {
		if (!perStaff.has(id)) {
			perStaff.set(id, {
				claimed: 0,
				closed: 0,
				id,
			});
		}
		return perStaff.get(id);
	};
	const category = id => {
		const key = id ?? 'none';
		if (!perCategory.has(key)) {
			perCategory.set(key, {
				closed: 0,
				created: 0,
				id: id ?? null,
				name: categories.get(id)?.name ?? null,
			});
		}
		return perCategory.get(key);
	};

	for (const ticket of tickets) {
		const createdAt = new Date(ticket.createdAt).getTime();
		const closedAt = ticket.closedAt ? new Date(ticket.closedAt).getTime() : null;
		const anonymous = categories.get(ticket.categoryId)?.anonymous === true;
		if (createdAt >= since) {
			const day = perDay.get(dayKey(createdAt));
			if (day) day.created++;
			created++;
			category(ticket.categoryId).created++;
			if (ticket.claimedById && !anonymous) staff(ticket.claimedById).claimed++;
			if (ticket.firstResponseAt) responseTimes.push(new Date(ticket.firstResponseAt).getTime() - createdAt);
		}
		if (closedAt && closedAt >= since) {
			const day = perDay.get(dayKey(closedAt));
			if (day) day.closed++;
			closed++;
			category(ticket.categoryId).closed++;
			// closing your own ticket isn't staff work
			if (ticket.closedById && ticket.closedById !== ticket.createdById && !anonymous) staff(ticket.closedById).closed++;
			resolutionTimes.push(closedAt - createdAt);
			if (ticket.feedback?.rating) ratings.push(ticket.feedback.rating);
		}
	}

	const avgResponse = average(responseTimes);
	const avgResolution = average(resolutionTimes);
	const avgRating = average(ratings);
	return {
		categories: [...perCategory.values()].sort((a, b) => b.created - a.created),
		days: [...perDay.entries()].map(([date, counts]) => ({
			date,
			...counts,
		})),
		staff: [...perStaff.values()].sort((a, b) => (b.closed + b.claimed) - (a.closed + a.claimed)).slice(0, 50),
		totals: {
			avgRating: avgRating === null ? null : Number(avgRating.toFixed(1)),
			avgResolutionTime: avgResolution === null ? null : ms(Math.round(avgResolution)),
			avgResponseTime: avgResponse === null ? null : ms(Math.round(avgResponse)),
			closed,
			created,
		},
	};
}

module.exports = {
	DAY,
	buildStatistics,
};
