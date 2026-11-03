/**
 * Prisma 6 removed `$use` middleware, so the existing middlewares are applied as a client extension
 * (upstream #582). They keep their `(params, next)` signature so they can still be tested on their own.
 */

const durationsMiddleware = require('./middleware/prisma-durations');
const sqliteMiddleware = require('./middleware/prisma-sqlite');

/**
 * Run a chain of `(params, next)` middlewares around a query; the first middleware is the outermost.
 * @param {Function[]} middlewares
 * @param {{ model?: string, operation: string, args: object, query: (args: object) => Promise<any> }} context
 * @returns {Promise<any>}
 */
function runMiddlewares(middlewares, {
	model, operation, args, query,
}) {
	const dispatch = (index, params) => {
		if (index === middlewares.length) return query(params.args);
		return middlewares[index](params, next => dispatch(index + 1, next));
	};
	return dispatch(0, {
		action: operation,
		args,
		model,
	});
}

/**
 * @param {string} provider the DB_PROVIDER
 * @returns {Function[]}
 */
function getMiddlewares(provider) {
	// durations are stored in seconds but used in milliseconds;
	// SQLite doesn't support JSON columns, so they are (de)serialised
	return provider === 'sqlite' ? [durationsMiddleware, sqliteMiddleware] : [durationsMiddleware];
}

/**
 * Apply the middlewares to a client. Event listeners (`$on`) must be added before this, because extended
 * clients don't have `$on`.
 * @template {import('@prisma/client').PrismaClient} T
 * @param {T} prisma
 * @param {string} provider
 * @returns {T}
 */
function extendPrisma(prisma, provider) {
	const middlewares = getMiddlewares(provider);
	return prisma.$extends({
		name: 'discord-tickets',
		query: {
			$allModels: {
				$allOperations: ({
					model, operation, args, query,
				}) => runMiddlewares(middlewares, {
					args,
					model,
					operation,
					query,
				}),
			},
		},
	});
}

module.exports = {
	extendPrisma,
	getMiddlewares,
	runMiddlewares,
};
