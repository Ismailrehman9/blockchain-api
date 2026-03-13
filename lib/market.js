import { config } from "./config.js";

const KRAKEN = "https://api.kraken.com/0/public";
const { defaultSymbol } = config;

// Simple in-memory cache (2-minute TTL)
const cache = new Map();
const CACHE_TTL_MS = 2 * 60 * 1000;

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { cache.delete(key); return null; }
  return entry.value;
}
function cacheSet(key, value) { cache.set(key, { value, ts: Date.now() }); }

// Map trading pair symbols to Kraken pair names
function symbolToKrakenPair(symbol) {
  const map = {
    BTCUSDT: "XBTUSD",
    ETHUSDT: "ETHUSD",
    SOLUSDT: "SOLUSD",
    XRPUSDT: "XRPUSD",
    BNBUSDT: "BNBUSD",
  };
  return map[symbol.toUpperCase()] ?? symbol.replace(/USDT$/i, "USD");
}

/**
 * Fetch current price for a symbol (e.g. BTCUSDT).
 * @returns {Promise<{ price: string, symbol: string } | { error: string }>}
 */
export async function getPrice(symbol = defaultSymbol) {
  const pair = symbolToKrakenPair(symbol);
  const cacheKey = `price:${pair}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = `${KRAKEN}/Ticker?pair=${pair}`;
  const start = Date.now();
  try {
    const resp = await fetch(url, { headers: { "Accept": "application/json" } });
    const durationMs = Date.now() - start;
    const data = await resp.json();
    if (!resp.ok || data.error?.length || !data.result) {
      console.warn("Market price failed", symbol, resp.status, data.error, durationMs);
      return { error: `Failed to fetch price for ${symbol}` };
    }
    // Kraken result key varies (e.g. XXBTZUSD, XBTUSD) — take first key
    const resultKey = Object.keys(data.result)[0];
    const price = data.result[resultKey].c[0]; // c = last trade [price, lot volume]
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
 * Fetch historical OHLCV klines in hourly intervals.
 * Each kline: [openTime(ms), open, high, low, close, volume]
 * @returns {Promise<{ klines: Array, symbol: string } | { error: string }>}
 */
export async function getKlines(symbol = defaultSymbol, interval = "1h", limit = 24) {
  const pair = symbolToKrakenPair(symbol);
  const cacheKey = `klines:${pair}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  // Kraken interval=60 means 60 minutes; since = unix seconds to start from
  const since = Math.floor(Date.now() / 1000) - (limit + 2) * 3600;
  const url = `${KRAKEN}/OHLC?pair=${pair}&interval=60&since=${since}`;
  const start = Date.now();
  try {
    const resp = await fetch(url, { headers: { "Accept": "application/json" } });
    const durationMs = Date.now() - start;
    const data = await resp.json();
    if (!resp.ok || data.error?.length || !data.result) {
      console.warn("Market klines failed", symbol, resp.status, data.error, durationMs);
      return { error: `Failed to fetch klines for ${symbol}` };
    }
    // Result contains the pair key and a "last" key — find the OHLC array
    const resultKey = Object.keys(data.result).find((k) => k !== "last");
    const ohlc = data.result[resultKey];
    // Kraken OHLC row: [time, open, high, low, close, vwap, volume, count]
    const klines = ohlc.slice(-limit).map(([time, open, high, low, close, , volume]) => [
      time * 1000,          // openTime in ms
      parseFloat(open),
      parseFloat(high),
      parseFloat(low),
      parseFloat(close),
      parseFloat(volume),
    ]);
    console.log("Market klines OK", symbol, klines.length, durationMs, "ms");
    const result = { klines, symbol };
    cacheSet(cacheKey, result);
    return result;
  } catch (err) {
    console.error("Market klines error", symbol, err.message);
    return { error: err.message };
  }
}
