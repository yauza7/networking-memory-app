/**
 * Minimal Upstash Redis REST client.
 *
 * Configure via env:
 *   UPSTASH_REDIS_REST_URL    e.g. https://us1-foo-bar.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN  long bearer token
 *
 * Falls back to KV_REST_API_URL / KV_REST_API_TOKEN (Vercel Marketplace names).
 */
const REST_URL =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  "";

const REST_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  "";

export const redisConfigured = !!(REST_URL && REST_TOKEN);

async function cmd<T = unknown>(args: (string | number)[]): Promise<T | null> {
  if (!redisConfigured) {
    console.warn("Redis not configured, skipping:", args[0]);
    return null;
  }
  try {
    const r = await fetch(REST_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args.map((a) => String(a))),
    });
    if (!r.ok) {
      console.error(`Redis ${args[0]} failed:`, r.status, await r.text());
      return null;
    }
    const json = (await r.json()) as { result: T };
    return json.result;
  } catch (e) {
    console.error(`Redis ${args[0]} error:`, e);
    return null;
  }
}

export const redis = {
  get: (key: string) => cmd<string | null>(["GET", key]),
  set: (key: string, value: string) => cmd<string>(["SET", key, value]),
  del: (key: string) => cmd<number>(["DEL", key]),

  hset: (key: string, fields: Record<string, string | number>) => {
    const flat: (string | number)[] = ["HSET", key];
    for (const [k, v] of Object.entries(fields)) flat.push(k, v);
    return cmd<number>(flat);
  },
  hget: (key: string, field: string) => cmd<string | null>(["HGET", key, field]),
  hgetall: async (key: string): Promise<Record<string, string> | null> => {
    const arr = await cmd<string[]>(["HGETALL", key]);
    if (!arr || !arr.length) return null;
    const obj: Record<string, string> = {};
    for (let i = 0; i < arr.length; i += 2) obj[arr[i]] = arr[i + 1];
    return obj;
  },

  zadd: (key: string, score: number, member: string) =>
    cmd<number>(["ZADD", key, score, member]),
  zrangebyscore: (key: string, min: number, max: number) =>
    cmd<string[]>(["ZRANGEBYSCORE", key, min, max]),
  zrem: (key: string, member: string) => cmd<number>(["ZREM", key, member]),

  // SCAN-style listing of keys by prefix (small datasets only)
  keys: (pattern: string) => cmd<string[]>(["KEYS", pattern]),
};
