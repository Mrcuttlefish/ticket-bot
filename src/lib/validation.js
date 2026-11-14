/**
 * Server-side validation for admin API request bodies.
 *
 * Request bodies used to be passed straight to Prisma, which accepts nested relation writes
 * (`connect`, `update`, `deleteMany`, ...) and foreign keys like `guildId`. That let a guild admin
 * modify records belonging to other guilds. Every writable field must now be listed in a schema;
 * unknown fields are dropped and values of the wrong type are rejected.
 */

const SNOWFLAKE = /^\d{17,20}$/;
// durations are in milliseconds but stored in seconds (see middleware/prisma-durations.js)
const MAX_DURATION = (2 ** 31 - 1) * 1000;

class ValidationError extends Error {
	constructor(field, message) {
		super(`Invalid value for "${field}": ${message}`);
		this.name = 'ValidationError';
		this.field = field;
		this.statusCode = 400;
	}
}

const isPlainJSON = value => {
	// JSON columns may hold any JSON value, but never functions/undefined/etc.
	try {
		return JSON.stringify(value) !== undefined;
	} catch {
		return false;
	}
};

const types = {
	boolean(value, field) {
		if (value === 'true') return true;
		if (value === 'false') return false;
		if (typeof value !== 'boolean') throw new ValidationError(field, 'expected a boolean');
		return value;
	},
	int(value, field, {
		max = 2 ** 31 - 1, min = 0,
	} = {}) {
		if (typeof value === 'string' && /^-?\d+$/.test(value)) value = Number(value);
		if (!Number.isSafeInteger(value)) throw new ValidationError(field, 'expected an integer');
		if (value < min || value > max) throw new ValidationError(field, `must be between ${min} and ${max}`);
		return value;
	},
	json(value, field) {
		if (!isPlainJSON(value)) throw new ValidationError(field, 'expected JSON');
		return value;
	},
	snowflake(value, field) {
		if (typeof value !== 'string' || !SNOWFLAKE.test(value)) throw new ValidationError(field, 'expected a Discord ID');
		return value;
	},
	snowflakes(value, field) {
		if (!Array.isArray(value)) throw new ValidationError(field, 'expected an array of Discord IDs');
		return value.map((v, i) => types.snowflake(v, `${field}[${i}]`));
	},
	string(value, field, { max = 4000 } = {}) {
		if (typeof value !== 'string') throw new ValidationError(field, 'expected a string');
		if (value.length > max) throw new ValidationError(field, `must be at most ${max} characters`);
		return value;
	},
};

/**
 * @typedef {object} FieldSpec
 * @property {keyof types | ((value: any, field: string) => any)} type
 * @property {boolean} [nullable]
 * @property {*} [nullValue] stored instead of null
 * @property {object} [options]
 */

/**
 * Pick and validate the fields listed in `schema` from `body`.
 * @param {object} body
 * @param {Record<string, FieldSpec>} schema
 * @returns {object}
 */
function sanitize(body, schema) {
	if (body === null || typeof body !== 'object' || Array.isArray(body)) {
		throw new ValidationError('body', 'expected an object');
	}
	const out = {};
	for (const [field, spec] of Object.entries(schema)) {
		if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
		let value = body[field];
		if (value === undefined) continue;
		if (value === null || (spec.nullable && value === '')) {
			if (!spec.nullable) throw new ValidationError(field, 'must not be empty');
			out[field] = spec.nullValue ?? null;
			continue;
		}
		const check = typeof spec.type === 'function' ? spec.type : types[spec.type];
		value = check(value, field, spec.options);
		out[field] = value;
	}
	return out;
}

const autoTag = (value, field) => {
	if (['all', 'ticket', '!ticket'].includes(value)) return value;
	return types.snowflakes(value, field);
};

const workingHours = (value, field) => {
	const time = /^\d{1,2}:\d{2}$/;
	if (!Array.isArray(value) || value.length !== 8 || typeof value[0] !== 'string') {
		throw new ValidationError(field, 'expected [timezone, ...7 days]');
	}
	return value.map((day, i) => {
		if (i === 0) return day;
		// the settings site sends null for days off (and getWorkingStatus treats anything else that isn't
		// a [start, end] pair as a day off), so null and [] are kept as days off
		if (day === null || (Array.isArray(day) && day.length === 0)) return null;
		if (!Array.isArray(day) || day.length !== 2 || !day.every(t => typeof t === 'string' && time.test(t))) {
			throw new ValidationError(`${field}[${i}]`, 'expected ["HH:MM", "HH:MM"] or null for a day off');
		}
		return day;
	});
};

const holidays = (value, field) => {
	const date = /^\d{4}-\d{2}-\d{2}$/;
	if (!Array.isArray(value) || value.length > 366) throw new ValidationError(field, 'expected up to 366 dates');
	return value.map((d, i) => {
		if (typeof d !== 'string' || !date.test(d)) throw new ValidationError(`${field}[${i}]`, 'expected "YYYY-MM-DD"');
		return d;
	});
};

const roleLimits = (value, field) => {
	if (!Array.isArray(value) || value.length > 50) throw new ValidationError(field, 'expected up to 50 { role, limit } objects');
	return value.map((rule, i) => ({
		limit: types.int(rule?.limit, `${field}[${i}].limit`, { max: 100 }),
		role: types.snowflake(rule?.role, `${field}[${i}].role`),
	}));
};

const pingRoleRules = (value, field) => {
	if (!Array.isArray(value) || value.length > 50) throw new ValidationError(field, 'expected up to 50 { roles, ping } objects');
	return value.map((rule, i) => ({
		ping: types.snowflakes(rule?.ping, `${field}[${i}].ping`),
		roles: types.snowflakes(rule?.roles, `${field}[${i}].roles`),
	}));
};

// events that can be left out of the log channel (see lib/logging.js)
const LOG_EVENTS = [
	'admin',
	'message.delete',
	'message.update',
	'ticket.claim',
	'ticket.close',
	'ticket.create',
	'ticket.delete',
	'ticket.reopen',
	'ticket.unclaim',
	'ticket.update',
];

const logExclude = (value, field) => {
	if (!Array.isArray(value)) throw new ValidationError(field, 'expected an array of event names');
	return [...new Set(value.map((event, i) => {
		if (!LOG_EVENTS.includes(event)) throw new ValidationError(`${field}[${i}]`, `expected one of ${LOG_EVENTS.join(', ')}`);
		return event;
	}))];
};

const webhookUrl = (value, field) => {
	const { checkWebhookURL } = require('./webhooks');
	const result = checkWebhookURL(value);
	if (!result.ok) throw new ValidationError(field, result.reason);
	return result.url.href;
};

const BUTTON_STYLES = ['PRIMARY', 'SECONDARY', 'SUCCESS', 'DANGER'];
const buttonStyle = (value, field) => {
	if (!BUTTON_STYLES.includes(value)) throw new ValidationError(field, `expected one of ${BUTTON_STYLES.join(', ')}`);
	return value;
};

// buttons whose label, emoji and colour can be changed (see lib/buttons.js)
const CUSTOM_BUTTONS = ['claim', 'close', 'create', 'delete', 'edit', 'reopen', 'transcript', 'unclaim'];

const buttons = (value, field) => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ValidationError(field, 'expected an object');
	const out = {};
	for (const [name, button] of Object.entries(value)) {
		if (!CUSTOM_BUTTONS.includes(name)) throw new ValidationError(`${field}.${name}`, `expected one of ${CUSTOM_BUTTONS.join(', ')}`);
		if (!button || typeof button !== 'object' || Array.isArray(button)) throw new ValidationError(`${field}.${name}`, 'expected an object');
		const clean = {};
		if (button.label !== undefined && button.label !== null && button.label !== '') {
			clean.label = types.string(String(button.label).trim(), `${field}.${name}.label`, { max: 80 });
		}
		if (button.emoji !== undefined && button.emoji !== null && button.emoji !== '') {
			clean.emoji = types.string(String(button.emoji).trim(), `${field}.${name}.emoji`, { max: 64 });
		}
		if (button.style !== undefined && button.style !== null && button.style !== '') {
			clean.style = buttonStyle(button.style, `${field}.${name}.style`);
		}
		// who can use the button (Manage Server can always use it, see lib/buttons.js)
		for (const list of ['allow', 'deny']) {
			if (button[list] === undefined || button[list] === null) continue;
			const ids = [...new Set(types.snowflakes(button[list], `${field}.${name}.${list}`))];
			if (ids.length > 25) throw new ValidationError(`${field}.${name}.${list}`, 'at most 25 roles');
			if (ids.length) clean[list] = ids;
		}
		if (Object.keys(clean).length) out[name] = clean;
	}
	return out;
};

const CREATOR_ROLE_EVENTS = ['claim', 'close', 'open'];

const oneOf = values => (value, field) => {
	if (!values.includes(value)) throw new ValidationError(field, `expected one of ${values.join(', ')}`);
	return value;
};

// Ticket Tool parity, P3: rules that run when a ticket has been waiting for a reply (see lib/automations.js)
const AUTOMATION_ACTIONS = ['CLOSE', 'TAG'];
const AUTOMATION_WAITING_ON = ['CREATOR', 'STAFF'];
const MIN_AUTOMATION_AFTER = 15 * 60 * 1000; // automations run every 15 minutes
const MAX_AUTOMATION_AFTER = 90 * 24 * 60 * 60 * 1000;

const automations = (value, field) => {
	if (!Array.isArray(value) || value.length > 10) throw new ValidationError(field, 'expected up to 10 rules');
	return value.map((rule, i) => {
		const at = `${field}[${i}]`;
		if (!rule || typeof rule !== 'object' || Array.isArray(rule)) throw new ValidationError(at, 'expected an object');
		const clean = {
			action: oneOf(AUTOMATION_ACTIONS)(rule.action, `${at}.action`),
			after: types.int(rule.after, `${at}.after`, {
				max: MAX_AUTOMATION_AFTER,
				min: MIN_AUTOMATION_AFTER,
			}),
			waitingOn: oneOf(AUTOMATION_WAITING_ON)(rule.waitingOn, `${at}.waitingOn`),
		};
		if (clean.action === 'TAG') {
			clean.tag = types.string(String(rule.tag ?? '').trim(), `${at}.tag`, { max: 100 });
			if (!clean.tag) throw new ValidationError(`${at}.tag`, 'choose a tag');
		}
		return clean;
	});
};


// roles are also checked against the guild and the admin's own permissions (see lib/creator-roles.js)
const creatorRoles = (value, field) => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ValidationError(field, 'expected an object');
	const out = {};
	for (const [event, change] of Object.entries(value)) {
		if (!CREATOR_ROLE_EVENTS.includes(event)) throw new ValidationError(`${field}.${event}`, `expected one of ${CREATOR_ROLE_EVENTS.join(', ')}`);
		if (!change || typeof change !== 'object' || Array.isArray(change)) throw new ValidationError(`${field}.${event}`, 'expected { add, remove }');
		const add = types.snowflakes(change.add ?? [], `${field}.${event}.add`);
		const remove = types.snowflakes(change.remove ?? [], `${field}.${event}.remove`);
		if (add.length + remove.length > 10) throw new ValidationError(`${field}.${event}`, 'at most 10 roles');
		if (add.length || remove.length) {
			out[event] = {
				add: [...new Set(add)],
				remove: [...new Set(remove)],
			};
		}
	}
	return out;
};

/** @type {Record<string, FieldSpec>} */
const guildSettings = {
	archive: { type: 'boolean' },
	autoClose: {
		nullable: true,
		// the column isn't nullable; 0 turns auto-close off (null used to cause a database error)
		nullValue: 0,
		options: { max: MAX_DURATION },
		type: 'int',
	},
	autoTag: { type: autoTag },
	blocklist: { type: 'snowflakes' },
	buttons: { type: buttons },
	dashboardRoles: {
		type: (value, field) => {
			const ids = [...new Set(types.snowflakes(value, field))];
			if (ids.length > 25) throw new ValidationError(field, 'at most 25 roles');
			return ids;
		},
	},
	claimButton: { type: 'boolean' },
	closeButton: { type: 'boolean' },
	closeRequests: { type: 'boolean' },
	componentsV2: { type: 'boolean' },
	errorColour: {
		options: { max: 32 },
		type: 'string',
	},
	footer: {
		nullable: true,
		options: { max: 2048 },
		type: 'string',
	},
	ghostPing: { type: 'boolean' },
	holidays: { type: holidays },
	locale: {
		options: { max: 16 },
		type: 'string',
	},
	logChannel: {
		nullable: true,
		type: 'snowflake',
	},
	logExclude: { type: logExclude },
	moveRelease: { type: 'boolean' },
	moveResend: { type: 'boolean' },
	primaryColour: {
		options: { max: 32 },
		type: 'string',
	},
	staleAfter: {
		nullable: true,
		options: { max: MAX_DURATION },
		type: 'int',
	},
	successColour: {
		options: { max: 32 },
		type: 'string',
	},
	ticketNumberOffset: {
		options: { max: 1e9 },
		type: 'int',
	},
	transcriptChannel: {
		nullable: true,
		type: 'snowflake',
	},
	transcriptDm: { type: 'boolean' },
	userLimit: {
		options: { max: 100 },
		type: 'int',
	},
	webhookSecret: {
		nullable: true,
		options: { max: 256 },
		type: 'string',
	},
	webhookUrl: {
		nullable: true,
		type: webhookUrl,
	},
	workingHours: { type: workingHours },
};

/** @type {Record<string, FieldSpec>} */
const category = {
	archive: {
		nullable: true,
		type: 'boolean',
	},
	autoClose: {
		nullable: true,
		options: { max: MAX_DURATION },
		type: 'int',
	},
	anonymous: { type: 'boolean' },
	automations: { type: automations },
	blockedRoles: { type: 'snowflakes' },
	buttonLabel: {
		nullable: true,
		options: { max: 80 },
		type: 'string',
	},
	buttonStyle: {
		nullable: true,
		type: buttonStyle,
	},
	channelName: {
		options: { max: 100 },
		type: 'string',
	},
	channelType: { type: oneOf(['CHANNEL', 'THREAD']) },
	claimButton: {
		nullable: true,
		type: 'boolean',
	},
	claimedCategory: {
		nullable: true,
		type: 'snowflake',
	},
	claimedChannelName: {
		nullable: true,
		options: { max: 100 },
		type: 'string',
	},
	claimHide: { type: 'boolean' },
	claiming: { type: 'boolean' },
	claimReleaseLocked: { type: 'boolean' },
	claimTakeover: { type: 'boolean' },
	closeButton: {
		nullable: true,
		type: 'boolean',
	},
	closedChannelName: {
		nullable: true,
		options: { max: 100 },
		type: 'string',
	},
	closedLimit: {
		options: { max: 100 },
		type: 'int',
	},
	closedMessage: {
		nullable: true,
		options: { max: 2000 },
		type: 'string',
	},
	cooldown: {
		nullable: true,
		options: { max: MAX_DURATION },
		type: 'int',
	},
	creatorRoles: { type: creatorRoles },
	customTopic: {
		nullable: true,
		options: { max: 45 },
		type: 'string',
	},
	description: {
		options: { max: 100 },
		type: 'string',
	},
	discordCategory: { type: 'snowflake' },
	emoji: {
		options: { max: 100 },
		type: 'string',
	},
	enableFeedback: { type: 'boolean' },
	fallbackCategories: { type: 'snowflakes' },
	image: {
		nullable: true,
		options: { max: 2048 },
		type: 'string',
	},
	keepClosedFor: {
		nullable: true,
		options: { max: MAX_DURATION },
		type: 'int',
	},
	memberLimit: { type: 'int' },
	name: {
		options: { max: 100 },
		type: 'string',
	},
	onCreatorLeave: { type: oneOf(['CLOSE', 'DELETE', 'KEEP']) },
	openDm: {
		nullable: true,
		options: { max: 2000 },
		type: 'string',
	},
	openingMessage: {
		options: { max: 4096 },
		type: 'string',
	},
	openingStyle: {
		type: (value, field) => {
			if (!['EMBED', 'OFF', 'TEXT'].includes(value)) throw new ValidationError(field, 'expected "EMBED", "TEXT" or "OFF"');
			return value;
		},
	},
	outOfHours: {
		type: (value, field) => {
			if (!['BLOCK', 'WARN'].includes(value)) throw new ValidationError(field, 'expected "WARN" or "BLOCK"');
			return value;
		},
	},
	pingRoleRules: { type: pingRoleRules },
	pingRoles: { type: 'snowflakes' },
	ratelimit: {
		nullable: true,
		type: 'int',
	},
	reopenedMessage: {
		nullable: true,
		options: { max: 2000 },
		type: 'string',
	},
	requireTopic: { type: 'boolean' },
	requiredRoles: { type: 'snowflakes' },
	roleLimits: { type: roleLimits },
	staleAfter: {
		nullable: true,
		options: { max: MAX_DURATION },
		type: 'int',
	},
	staffRoles: { type: 'snowflakes' },
	staffThread: { type: 'boolean' },
	suggestTags: { type: 'boolean' },
	threadParent: {
		nullable: true,
		type: 'snowflake',
	},
	totalLimit: { type: 'int' },
	workingHours: {
		nullable: true,
		type: workingHours,
	},
};

/** @type {Record<string, FieldSpec>} */
const question = {
	id: {
		options: { max: 36 },
		type: 'string',
	},
	label: {
		options: { max: 45 },
		type: 'string',
	},
	maxLength: {
		nullable: true,
		options: { max: 4000 },
		type: 'int',
	},
	minLength: {
		nullable: true,
		options: { max: 4000 },
		type: 'int',
	},
	// options for "MENU" questions (upstream #446)
	options: {
		type: (value, field) => {
			if (typeof value === 'string') {
				try {
					value = JSON.parse(value);
				} catch {
					throw new ValidationError(field, 'expected an array of options');
				}
			}
			if (!Array.isArray(value)) throw new ValidationError(field, 'expected an array of options');
			if (value.length > 25) throw new ValidationError(field, 'a menu can have at most 25 options');
			return value.map((option, i) => {
				const label = typeof option?.label === 'string' ? option.label.trim() : '';
				if (!label || label.length > 100) throw new ValidationError(`${field}[${i}].label`, 'expected 1 to 100 characters');
				const clean = { label };
				if (option.description !== undefined && option.description !== null && option.description !== '') {
					if (typeof option.description !== 'string' || option.description.length > 100) throw new ValidationError(`${field}[${i}].description`, 'expected up to 100 characters');
					clean.description = option.description;
				}
				if (option.emoji !== undefined && option.emoji !== null && option.emoji !== '') {
					if (typeof option.emoji !== 'string' || option.emoji.length > 64) throw new ValidationError(`${field}[${i}].emoji`, 'expected an emoji');
					clean.emoji = option.emoji;
				}
				return clean;
			});
		},
	},
	order: { type: 'int' },
	placeholder: {
		nullable: true,
		options: { max: 100 },
		type: 'string',
	},
	required: { type: 'boolean' },
	style: {
		options: {
			max: 2,
			min: 1,
		},
		type: 'int',
	},
	type: {
		type: (value, field) => {
			if (!['MENU', 'TEXT'].includes(value)) throw new ValidationError(field, 'expected "MENU" or "TEXT"');
			return value;
		},
	},
	value: {
		nullable: true,
		options: { max: 4000 },
		type: 'string',
	},
};

/** @type {Record<string, FieldSpec>} */
const tag = {
	autoDm: { type: 'boolean' },
	content: {
		options: { max: 4096 },
		type: 'string',
	},
	matchType: { type: oneOf(['REGEX', 'WILDCARD']) },
	name: {
		options: { max: 100 },
		type: 'string',
	},
	regex: {
		nullable: true,
		options: { max: 200 },
		type: 'string',
	},
};

/**
 * Validate a category body, including its nested questions.
 * @param {object} body
 * @returns {{ data: object, questions: object[] | undefined }}
 */
function sanitizeCategory(body) {
	const data = sanitize(body, category);
	let questions;
	if (body.questions !== undefined) {
		if (!Array.isArray(body.questions)) throw new ValidationError('questions', 'expected an array');
		if (body.questions.length > 25) throw new ValidationError('questions', 'too many questions');
		questions = body.questions.map((q, i) => {
			const clean = sanitize(q, question);
			if (clean.type === 'MENU' && !clean.options?.length) throw new ValidationError(`questions[${i}].options`, 'a menu needs at least one option');
			if (new Set((clean.options ?? []).map(o => o.label)).size !== (clean.options ?? []).length) {
				throw new ValidationError(`questions[${i}].options`, 'option labels must be different');
			}
			return clean;
		});
	}
	return {
		data,
		questions,
	};
}

module.exports = {
	AUTOMATION_ACTIONS,
	AUTOMATION_WAITING_ON,
	BUTTON_STYLES,
	CREATOR_ROLE_EVENTS,
	CUSTOM_BUTTONS,
	LOG_EVENTS,
	SNOWFLAKE,
	ValidationError,
	sanitize,
	sanitizeCategory,
	schemas: {
		category,
		guildSettings,
		question,
		tag,
	},
	types,
};
