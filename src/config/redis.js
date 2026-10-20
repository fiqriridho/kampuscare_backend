const Redis = require('ioredis');
const { REDIS_URL } = require('./env');

// In-memory store fallback ketika server Redis lokal tidak aktif
const memoryStore = new Map();

const memoryFallback = {
  isFallback: true,
  async set(key, val, ex, ttl) {
    const expireAt = ttl && ttl > 0 ? Date.now() + ttl * 1000 : null;
    memoryStore.set(key, { val, expireAt });
    return 'OK';
  },
  async exists(key) {
    const item = memoryStore.get(key);
    if (!item) return 0;
    if (item.expireAt && Date.now() > item.expireAt) {
      memoryStore.delete(key);
      return 0;
    }
    return 1;
  },
  async scan(cursor, matchArg, pattern, countArg, count) {
    const prefix = (pattern || '').replace('*', '');
    const now = Date.now();
    const validKeys = [];

    for (const [k, item] of memoryStore.entries()) {
      if (item.expireAt && now > item.expireAt) {
        memoryStore.delete(k);
      } else if (k.startsWith(prefix)) {
        validKeys.push(k);
      }
    }
    return ['0', validKeys];
  },
  async del(...keys) {
    let deleted = 0;
    for (const k of keys) {
      if (memoryStore.delete(k)) {
        deleted++;
      }
    }
    return deleted;
  },
  on() {},
};

let client;
let isRedisConnected = false;

try {
  const realRedis = new Redis(REDIS_URL, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    connectTimeout: 1500,
    retryStrategy(times) {
      // Hentikan reconnect jika tidak ada Redis lokal agar tidak membebani log & CPU
      if (times > 1) {
        return null;
      }
      return 1000;
    },
  });

  realRedis.on('connect', () => {
    isRedisConnected = true;
  });

  realRedis.on('ready', () => {
    isRedisConnected = true;
  });

  realRedis.on('error', (err) => {
    isRedisConnected = false;
    // Redam error ECONNREFUSED agar tidak muncul log spam [Redis Error] di terminal
  });

  realRedis.on('close', () => {
    isRedisConnected = false;
  });

  // Client proxy: arahkan ke realRedis jika terhubung, fallback ke memoryStore jika offline
  client = new Proxy(realRedis, {
    get(target, prop) {
      if (prop === 'isFallback') {
        return !isRedisConnected;
      }

      if (typeof target[prop] === 'function') {
        return async (...args) => {
          if (!isRedisConnected) {
            if (target.status === 'wait') {
              try {
                await target.connect();
                isRedisConnected = true;
                return await target[prop](...args);
              } catch {
                isRedisConnected = false;
                if (typeof memoryFallback[prop] === 'function') {
                  return memoryFallback[prop](...args);
                }
              }
            } else if (typeof memoryFallback[prop] === 'function') {
              return memoryFallback[prop](...args);
            }
          }

          try {
            return await target[prop](...args);
          } catch (err) {
            isRedisConnected = false;
            if (typeof memoryFallback[prop] === 'function') {
              return memoryFallback[prop](...args);
            }
            throw err;
          }
        };
      }
      return target[prop];
    },
  });
} catch (e) {
  client = memoryFallback;
}

module.exports = client;
