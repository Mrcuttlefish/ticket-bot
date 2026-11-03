/**
 * Turns exported ticket JSON into a Prisma `ticket.create` payload.
 *
 * Import files are untrusted (they may have been edited or come from someone else), so only known
 * scalar fields are copied. Everything that links to other rows (guild, category, users, the ticket
 * that messages belong to) is set here rather than taken from the file, so an import can't write
 * to another guild's data or to global user rows.
 */

const SNOWFLAKE = /^\d{17,20}$/;

/**
 * Copy only `keys` from `source`.
 * @param {object} source
 * @param {string[]} keys
 * @returns {object}
 */
function pick(source, keys) {
	const out = {};
	if (!source || typeof source !== 'object') return out;
	for (const key of keys) {
		if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) out[key] = source[key];
	}
	return out;
}

const snowflake = (value, field) => {
	if (typeof value !== 'string' || !SNOWFLAKE.test(value)) throw new Error(`Invalid ${field}: ${value}`);
	return value;
};

const optionalSnowflake = (value, field) => (value === null || value === undefined ? null : snowflake(value, field));

const userRef = id => ({
	connectOrCreate: {
		create: { id },
		where: { id },
	},
});

const TICKET_FIELDS = [
	'closedAt',
	'closedReason',
	'createdAt',
	'deleted',
	'firstResponseAt',
	'lastMessageAt',
	'messageCount',
	'number',
	'open',
	'openingMessageId',
	'pinnedMessageIds',
	'priority',
	'referencesMessageId',
	'topic',
];

/**
 * @param {object} raw a parsed line of tickets.jsonl
 * @param {string} guildId the guild being imported into
 * @param {Map<number, number>} categoryMap old category ID -> new category ID
 * @param {(text: string) => string} encrypt
 * @returns {[object, object[]]} the ticket create payload and its archived messages
 */
function importTicket(raw, guildId, categoryMap, encrypt) {
	const id = snowflake(raw.id, 'ticket id');
	const ticket = pick(raw, TICKET_FIELDS);
	ticket.id = id;

	if (!Number.isSafeInteger(ticket.number)) throw new Error(`Invalid ticket number for ${id}`);
	ticket.openingMessageId = snowflake(ticket.openingMessageId, 'openingMessageId');
	ticket.referencesMessageId = optionalSnowflake(ticket.referencesMessageId, 'referencesMessageId');
	ticket.closedReason &&= encrypt(ticket.closedReason);
	ticket.topic &&= encrypt(ticket.topic);

	ticket.guild = { connect: { id: guildId } };

	if (raw.categoryId !== null && raw.categoryId !== undefined) {
		const categoryId = categoryMap.get(raw.categoryId);
		if (categoryId === undefined) throw new Error(`Ticket ${id} references unknown category ${raw.categoryId}`);
		ticket.category = { connect: { id: categoryId } };
	}

	ticket.createdBy = userRef(snowflake(raw.createdById, 'createdById'));
	if (raw.claimedById) ticket.claimedBy = userRef(snowflake(raw.claimedById, 'claimedById'));
	if (raw.closedById) ticket.closedBy = userRef(snowflake(raw.closedById, 'closedById'));

	// archived data: copy scalar fields only; `ticketId` is implied by the nested create
	ticket.archivedChannels = { create: (raw.archivedChannels ?? []).map(c => pick(c, ['channelId', 'createdAt', 'name'])) };
	ticket.archivedRoles = { create: (raw.archivedRoles ?? []).map(r => pick(r, ['colour', 'createdAt', 'name', 'roleId'])) };
	ticket.archivedUsers = {
		create: (raw.archivedUsers ?? []).map(u => {
			const user = pick(u, ['avatar', 'bot', 'createdAt', 'discriminator', 'displayName', 'roleId', 'userId', 'username']);
			user.displayName &&= encrypt(user.displayName);
			user.username &&= encrypt(user.username);
			return user;
		}),
	};

	// messages are inserted separately with createMany, so `ticketId` must be forced to this ticket
	const messages = (raw.archivedMessages ?? []).map(m => {
		const message = pick(m, ['authorId', 'content', 'createdAt', 'deleted', 'edited', 'external', 'id']);
		message.ticketId = id;
		message.content &&= encrypt(message.content);
		return message;
	});

	if (raw.feedback) {
		const feedback = pick(raw.feedback, ['comment', 'createdAt', 'rating']);
		feedback.comment &&= encrypt(feedback.comment);
		feedback.guild = { connect: { id: guildId } };
		if (raw.feedback.userId) feedback.user = userRef(snowflake(raw.feedback.userId, 'feedback userId'));
		ticket.feedback = { create: feedback };
	}

	if (raw.questionAnswers?.length) {
		// fixes upstream #651: exported answers include `ticketId` and `id`, which nested creates reject
		ticket.questionAnswers = {
			create: raw.questionAnswers.map(a => {
				const answer = pick(a, ['createdAt', 'questionId', 'userId', 'value']);
				answer.userId = snowflake(answer.userId, 'answer userId');
				answer.value &&= encrypt(answer.value);
				return answer;
			}),
		};
	}

	if (raw.referencesTicketId) {
		// the import route drops this unless the referenced ticket is part of the same import
		ticket.referencesTicket = { connect: { id: snowflake(raw.referencesTicketId, 'referencesTicketId') } };
	}

	return [ticket, messages];
}

module.exports = {
	importTicket,
	pick,
};
