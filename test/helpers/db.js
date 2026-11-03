/**
 * A real database for integration tests, with every migration applied.
 *
 * SQLite is used by default (a new file for each call). To run the same tests against PostgreSQL or MySQL,
 * set TEST_DB_PROVIDER and TEST_DB_URL (a server the tests may create databases on) and generate the client
 * for that provider. Each call gets its own new schema (PostgreSQL) or database (MySQL), which is dropped
 * afterwards, so existing data is never touched. CI does this for all three providers.
 */

const { execFileSync } = require('node:child_process');
const {
	mkdtempSync, rmSync,
} = require('node:fs');
const { tmpdir } = require('node:os');
const { randomBytes } = require('node:crypto');
const { join } = require('node:path');

const ROOT = join(__dirname, '../..');
const PRISMA = join(ROOT, 'node_modules/.bin/prisma');

const provider = process.env.TEST_DB_PROVIDER || 'sqlite';

/**
 * @returns {Promise<{ prisma: import('@prisma/client').PrismaClient, provider: string, url: string, cleanup: () => Promise<void> }>}
 */
async function createTestDatabase() {
	const { PrismaClient } = require('@prisma/client');
	let url;
	let dir;
	let drop;
	const name = `tickets_test_${process.pid}_${randomBytes(4).toString('hex')}`;
	if (provider === 'sqlite') {
		dir = mkdtempSync(join(tmpdir(), 'tickets-test-'));
		url = `file:${join(dir, 'test.db')}`;
	} else {
		if (!process.env.TEST_DB_URL) throw new Error('TEST_DB_URL is required when TEST_DB_PROVIDER is not sqlite');
		const server = new URL(process.env.TEST_DB_URL);
		const admin = new PrismaClient({ datasources: { db: { url: server.toString() } } });
		const target = new URL(server);
		if (provider === 'postgresql') {
			target.searchParams.set('schema', name); // created by `migrate deploy`
			drop = () => admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${name}" CASCADE`);
		} else {
			await admin.$executeRawUnsafe(`CREATE DATABASE \`${name}\``);
			target.pathname = `/${name}`;
			drop = () => admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${name}\``);
		}
		url = target.toString();
		const dropAndDisconnect = drop;
		drop = async () => {
			await dropAndDisconnect();
			await admin.$disconnect();
		};
	}

	const env = {
		...process.env,
		DB_CONNECTION_URL: url,
		PRISMA_HIDE_UPDATE_MESSAGE: '1',
	};
	const schema = join(ROOT, `db/${provider}/schema.prisma`);
	// every migration, exactly as `npm install` applies them to real installs
	execFileSync(PRISMA, ['migrate', 'deploy', '--schema', schema], {
		env,
		stdio: 'pipe',
	});

	const { extendPrisma } = require('../../src/lib/prisma');
	const base = new PrismaClient({ datasources: { db: { url } } });
	const prisma = extendPrisma(base, provider);

	return {
		async cleanup() {
			await base.$disconnect();
			if (drop) await drop();
			if (dir) {
				rmSync(dir, {
					force: true,
					recursive: true,
				});
			}
		},
		prisma,
		provider,
		url,
	};
}

module.exports = {
	createTestDatabase,
	provider,
};
