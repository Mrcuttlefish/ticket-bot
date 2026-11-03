const {
	spawn,
	Pool,
	Thread,
	Worker,
} = require('threads');
const { cpus } = require('node:os');

/**
 * Create a single-use thread pool
 * @param {number} num fraction of available CPUs to use (ceil'd), or absolute number
 * @param {string} name name of file in workers directory
 * @param {function} fun async function
 * @param {import('threads/dist/master/pool').PoolOptions} options
 * @returns {Promise<any>}
 */
async function quickPool(num, name, fun, options) {
	const pool = reusablePool(num, name, options);
	try {
		return await fun(pool);
	} finally {
		pool.settled().then(() => pool.terminate());
	}
};

/**
 * Create a multi-use thread pool
 * @param {number} num fraction of available CPUs to use (ceil'd), or absolute number
 * @param {string} name name of file in workers directory
 * @param {import('threads/dist/master/pool').PoolOptions} options
 */
function reusablePool(num, name, options) {
	const size = num < 1 ? Math.ceil(num * (parseInt(process.env.CPU_LIMIT) || cpus().length)) : num;
	const pool = Pool(() => spawn(new Worker(`./workers/${name}.js`)), {
		...options,
		size,
	});
	return pool;
};

/**
 * Spawn one thread, do something, and terminate it
 * @param {string} name name of file in workers directory
 * @param {function} fun async function
 * @returns {Promise<any}
 */
async function quick(name, fun) {
	const thread = await spawn(new Worker(`./workers/${name}.js`));
	try {
		// ! this await is extremely important
		return await fun(thread);
	} finally {
		Thread.terminate(thread);
	}
};

/**
 * Spawn one thread
 * @param {string} name name of file in workers directory
 * @returns {Promise<{terminate: function}>}
 */
async function reusable(name) {
	const thread = await spawn(new Worker(`./workers/${name}.js`));
	thread.terminate = () => Thread.terminate(thread);
	return thread;
};

const poolSizes = {
	crypto: .5,
	export: .33,
	import: .33,
	stats: .25,
	transcript: .5,
};
const created = {};

// pools are created when they're first used, so loading a module doesn't start threads it may never need
// (this also stops tests from hanging on idle workers)
const pools = {};
for (const [name, size] of Object.entries(poolSizes)) {
	Object.defineProperty(pools, name, {
		enumerable: true,
		get: () => (created[name] ??= reusablePool(size, name)),
	});
}

/**
 * Terminate every pool that has been created (used by tests and on shutdown)
 * @returns {Promise<void>}
 */
async function terminatePools() {
	await Promise.all(Object.keys(created).map(async name => {
		await created[name].terminate(true);
		delete created[name];
	}));
}

module.exports = {
	pools,
	terminatePools,
	quick,
	quickPool,
	reusable,
	reusablePool,
};
