/**
 * An in-memory Keyv store that actually forgets expired entries.
 *
 * Keyv's default `Map` store only drops an expired entry when that exact key is read again. Most keys
 * here are per user or per channel (rate limits, cooldowns, "staff offline" notices, autocomplete caches)
 * and are rarely read again, so they accumulated forever: a slow, linear memory leak (upstream #659).
 */
class TTLMap extends Map {
	/**
	 * @param {number} [sweepInterval] how often to remove expired entries, in ms
	 */
	constructor(sweepInterval = 60_000) {
		super();
		/** @type {Map<string, number>} */
		this.expiries = new Map();
		this.timer = setInterval(() => this.sweep(), sweepInterval);
		this.timer.unref?.(); // don't keep the process alive
	}

	set(key, value, ttl) {
		super.set(key, value);
		// `expiries` is created after `super()`, which may call `set` itself
		if (this.expiries) {
			if (typeof ttl === 'number' && ttl > 0) this.expiries.set(key, Date.now() + ttl);
			else this.expiries.delete(key);
		}
		return this;
	}

	delete(key) {
		this.expiries?.delete(key);
		return super.delete(key);
	}

	clear() {
		this.expiries?.clear();
		return super.clear();
	}

	/**
	 * Remove expired entries.
	 * @param {number} [now]
	 * @returns {number} how many entries were removed
	 */
	sweep(now = Date.now()) {
		let removed = 0;
		for (const [key, expires] of this.expiries) {
			if (expires <= now) {
				this.delete(key);
				removed++;
			}
		}
		return removed;
	}
}

module.exports = TTLMap;
