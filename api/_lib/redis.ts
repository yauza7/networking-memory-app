/**
 * Redis client (TCP via ioredis). Singleton per warm Vercel function
 * instance so we don't reconnect on every invocation.
 *
 * Configure via env: REDIS_URL=redis://default:<password>@<host>:<port>
 */
import IORedis from "ioredis";

const URL = process.env.REDIS_URL || "";

export const redisConfigured = !!URL;

let _client: IORedis | null = null;

function client(): IORedis | null {
  if (!redisConfigured) return null;
  if (_client) return _client;
  _client = new IORedis(URL, {
    lazyConnect: false,
    enableReadyCheck: true,
    maxRetriesPerRequest: 2,
    connectTimeout: 5000,
  });
  _client.on("error", (e) => console.error("Redis error:", e.message));
  return _client;
}

export const redis = {
  get: async (key: string): Promise<string | null> => {
    const c = client();
    if (!c) return null;
    try {
      return await c.get(key);
    } catch (e) {
      console.error("Redis GET error:", e);
      return null;
    }
  },

  set: async (key: string, value: string): Promise<void> => {
    const c = client();
    if (!c) return;
    try {
      await c.set(key, value);
    } catch (e) {
      console.error("Redis SET error:", e);
    }
  },

  del: async (key: string): Promise<void> => {
    const c = client();
    if (!c) return;
    try {
      await c.del(key);
    } catch (e) {
      console.error("Redis DEL error:", e);
    }
  },

  hset: async (key: string, fields: Record<string, string | number>): Promise<void> => {
    const c = client();
    if (!c) return;
    try {
      const flat: (string | number)[] = [];
      for (const [k, v] of Object.entries(fields)) flat.push(k, v);
      await c.hset(key, ...flat);
    } catch (e) {
      console.error("Redis HSET error:", e);
    }
  },

  hgetall: async (key: string): Promise<Record<string, string> | null> => {
    const c = client();
    if (!c) return null;
    try {
      const obj = await c.hgetall(key);
      return obj && Object.keys(obj).length ? obj : null;
    } catch (e) {
      console.error("Redis HGETALL error:", e);
      return null;
    }
  },

  zadd: async (key: string, score: number, member: string): Promise<void> => {
    const c = client();
    if (!c) return;
    try {
      await c.zadd(key, score, member);
    } catch (e) {
      console.error("Redis ZADD error:", e);
    }
  },

  zrangebyscore: async (key: string, min: number, max: number): Promise<string[]> => {
    const c = client();
    if (!c) return [];
    try {
      return await c.zrangebyscore(key, min, max);
    } catch (e) {
      console.error("Redis ZRANGEBYSCORE error:", e);
      return [];
    }
  },

  zrem: async (key: string, member: string): Promise<void> => {
    const c = client();
    if (!c) return;
    try {
      await c.zrem(key, member);
    } catch (e) {
      console.error("Redis ZREM error:", e);
    }
  },

  keys: async (pattern: string): Promise<string[]> => {
    const c = client();
    if (!c) return [];
    try {
      return await c.keys(pattern);
    } catch (e) {
      console.error("Redis KEYS error:", e);
      return [];
    }
  },
};
