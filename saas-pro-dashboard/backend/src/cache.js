import Redis from "ioredis";
import { config } from "./config.js";

const memory = new Map();
let redis = null;

try {
  redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
  redis.connect().catch(() => {
    redis = null;
  });
} catch {
  redis = null;
}

export async function cacheGet(key) {
  if (redis) {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  }
  const entry = memory.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return entry.value;
}

export async function cacheSet(key, value, ttlSeconds = 30) {
  if (redis) {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    return;
  }
  memory.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function cacheDelByPrefix(prefix) {
  if (redis) {
    const keys = await redis.keys(`${prefix}*`);
    if (keys.length) await redis.del(keys);
    return;
  }
  [...memory.keys()].forEach((k) => {
    if (k.startsWith(prefix)) memory.delete(k);
  });
}

