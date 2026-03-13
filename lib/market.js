import { config } from "./config.js";

const COINGECKO = "https://api.coingecko.com/api/v3";
const { defaultSymbol } = config;

// Simple in-memory cache to avoid CoinGecko rate limits (2-minute TTL)
const cache = new Map();
const CACHE_TTL_MS = 2 * 60 * 1000;

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { cache.delete(key); return null; }
  return entry.value;
}
function cacheSet(key, value) { cache.set(key, { value, ts: Date.now() }); }

// Map trading pair symbols to CoinGecko coin IDs
function symbolToId(symbol) {
  const map = {
    BTCUSDT: "bitcoin",
    ETHUSDT: "ethereum",
    BNBUSDT: "binancecoin",
    SOLUSDT: "solana",
    XRPUSDT: "ripple",
  };
  return map[symbol.toUpperCase()] ?? symbol.toLowerCase().replace("usdt", "");
}

/**
 * Fetch current price for a symbol (e.g. BTCUSDT).
 * @returns {Promise<{ price: string, symbol: string } | { error: string }>}
 */
export async function getPrice(symbol = defaultSymbol) {
  const id = symbolToId(symbol);
  const cacheKey = `price:${id}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = `${COINGECKO}/simple/price?ids=${id}&vs_currencies=usd`;
  const start = Date.now();
  try {
    const resp = await fetch(url, { headers: { "Accept": "application/json" } });
    const durationMs = Date.now() - start;
    const data = await resp.json();
    if (!resp.ok || !data[id]) {
      console.warn("Market price failed", symbol, resp.status, durationMs);
      return { error: `Failed to fetch price for ${symbol}` };
    }
    const price = data[id].usd.toString();
    console.log("Market price OK", symbol, price, durationMs, "ms");
    const result = { price, symbol };
    cacheSet(cacheKey, result);
    return result;
  } catch (err) {
    console.error("Market price error", symbol, err.message);
    return { error: err.message };
  }
}

/**
 * Fetch historical price data and return in kline format.
 * Each kline: [openTime, open, high, low, close, volume]
 * @returns {Promise<{ klines: Array, symbol: string } | { error: string }>}
 */
export async function getKlines(symbol = defaultSymbol, interval = "1h", limit = 24) {
  const id = symbolToId(symbol);
  const cacheKey = `klines:${id}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const days = Math.ceil(limit / 24) + 1;
  const url = `${COINGECKO}/coins/${id}/market_chart?vs_currency=usd&days=${days}&interval=hourly`;
  const start = Date.now();
  try {
    const resp = await fetch(url, { headers: { "Accept": "application/json" } });
    const durationMs = Date.now() - start;
    if (resp.status === 429) {
      console.warn("Market klines rate-limited", symbol, durationMs);
      return { error: `Rate limited fetching klines for ${symbol}` };
    }
    const data = await resp.json();
    if (!resp.ok || !Array.isArray(data.prices)) {
      console.warn("Market klines failed", symbol, resp.status, durationMs);
      return { error: `Failed to fetch klines for ${symbol}` };
    }
    // Convert [timestamp, price] → [openTime, open, high, low, close, volume]
    const klines = data.prices.slice(-limit).map(([ts, price]) => [ts, price, price, price, price, 0]);
    console.log("Market klines OK", symbol, klines.length, durationMs, "ms");
    const result = { klines, symbol };
    cacheSet(cacheKey, result);
    return result;
  } catch (err) {
    console.error("Market klines error", symbol, err.message);
    return { error: err.message };
  }
}
