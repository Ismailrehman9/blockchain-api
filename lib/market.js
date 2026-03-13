import { config } from "./config.js";

const CC = "https://min-api.cryptocompare.com/data";
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

// Map trading pair symbols to CryptoCompare base symbols
function symbolToCC(symbol) {
  const map = {
    BTCUSDT: "BTC",
    ETHUSDT: "ETH",
    SOLUSDT: "SOL",
    XRPUSDT: "XRP",
    BNBUSDT: "BNB",
  };
  return map[symbol.toUpperCase()] ?? symbol.replace(/USDT$/i, "");
}

/**
 * Fetch current price for a symbol (e.g. BTCUSDT).
 * @returns {Promise<{ price: string, symbol: string } | { error: string }>}
 */
export async function getPrice(symbol = defaultSymbol) {
  const fsym = symbolToCC(symbol);
  const cacheKey = `price:${fsym}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = `${CC}/price?fsym=${fsym}&tsyms=USD`;
  const start = Date.now();
  try {
    const resp = await fetch(url, { headers: { "Accept": "application/json" } });
    const durationMs = Date.now() - start;
    const data = await resp.json();
    if (!resp.ok || !data.USD) {
      console.warn("Market price failed", symbol, resp.status, durationMs);
      return { error: `Failed to fetch price for ${symbol}` };
    }
    const price = data.USD.toString();
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
  const fsym = symbolToCC(symbol);
  const cacheKey = `klines:${fsym}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = `${CC}/v2/histohour?fsym=${fsym}&tsym=USD&limit=${limit}`;
  const start = Date.now();
  try {
    const resp = await fetch(url, { headers: { "Accept": "application/json" } });
    const durationMs = Date.now() - start;
    const data = await resp.json();
    if (!resp.ok || data.Response !== "Success" || !Array.isArray(data.Data?.Data)) {
      console.warn("Market klines failed", symbol, resp.status, data.Message, durationMs);
      return { error: `Failed to fetch klines for ${symbol}` };
    }
    // CryptoCompare row: { time, open, high, low, close, volumefrom }
    const klines = data.Data.Data.map(({ time, open, high, low, close, volumefrom }) => [
      time * 1000,  // openTime in ms
      open,
      high,
      low,
      close,
      volumefrom,
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
