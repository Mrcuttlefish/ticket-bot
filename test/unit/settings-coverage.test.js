/**
 * Every setting stored for a server, category, question or tag must be writable through the admin API
 * (and so through the dashboard), unless it's listed here as not a setting.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { schemas } = require('../../src/lib/validation');

// relations, IDs, timestamps and values the bot keeps itself
const NOT_SETTINGS = {
	Category: ['createdAt', 'guild', 'guildId', 'id', 'questions', 'tickets'],
	Guild: ['auditLogs', 'categories', 'createdAt', 'feedback', 'id', 'tags', 'tickets'],
	Question: ['answers', 'category', 'categoryId', 'createdAt'],
	Tag: ['createdAt', 'guild', 'guildId', 'id', 'preventedCount'],
};

const fields = (schema, model) => {
	const block = schema.match(new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`))[1];
	return block.split('\n')
		.map(line => line.trim().split(/\s+/)[0])
		.filter(name => name && !name.startsWith('@@') && !name.startsWith('//'));
};

for (const provider of ['mysql', 'postgresql', 'sqlite']) {
	test(`every ${provider} setting can be changed through the admin API`, () => {
		const schema = readFileSync(join(__dirname, `../../db/${provider}/schema.prisma`), 'utf8');
		const writable = {
			Category: schemas.category,
			Guild: schemas.guildSettings,
			Question: schemas.question,
			Tag: schemas.tag,
		};
		for (const [model, validated] of Object.entries(writable)) {
			assert.ok(validated, `no validation schema for ${model}`);
			const missing = fields(schema, model)
				.filter(field => !NOT_SETTINGS[model].includes(field) && !(field in validated));
			assert.deepEqual(missing, [], `${model} settings the admin API can't change`);
		}
	});
}
