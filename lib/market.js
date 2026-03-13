import { config } from "./config.js";

const { binanceBaseUrl, defaultSymbol } = config;

/**
 * Fetch current price for a symbol (e.g. BTCUSDT).
 * @param {string} [symbol] - Trading pair (default from config)
 * @returns {Promise<{ price: string, symbol: string } | { error: string }>}
 */
export async function getPrice(symbol = defaultSymbol) {
  const url = `${binanceBaseUrl}/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`;
  console.log("Market fetch price", symbol, binanceBaseUrl);
  const start = Date.now();
  try {
    const resp = await fetch(url);
    const durationMs = Date.now() - start;
    const data = await resp.json();
    if (!resp.ok) {
      console.warn("Market price failed", symbol, resp.status, durationMs, data.code, data.msg);
      return { error: data.msg || `HTTP ${resp.status}` };
    }
    console.log("Market price OK", symbol, data.price, durationMs, "ms");
    return { price: data.price, symbol: data.symbol ?? symbol };
  } catch (err) {
    const durationMs = Date.now() - start;
    console.error("Market price error", symbol, durationMs, err.message);
    return { error: err.message };
  }
}

/**
 * Fetch klines (candlestick) data for a symbol.
 * @param {string} [symbol] - Trading pair (default from config)
 * @param {string} [interval] - e.g. "1h", "1d"
 * @param {number} [limit] - Number of klines (default 24)
 * @returns {Promise<{ klines: Array, symbol: string } | { error: string }>}
 *   Each kline: [ openTime, open, high, low, close, volume, ... ]
 */
export async function getKlines(
  symbol = defaultSymbol,
  interval = "1h",
  limit = 24
) {
  const params = new URLSearchParams({
    symbol,
    interval,
    limit: String(Math.min(Math.max(1, limit), 1500)),
  });
  const url = `${binanceBaseUrl}/api/v3/klines?${params}`;
  console.log("Market fetch klines", symbol, interval, limit, binanceBaseUrl);
  const start = Date.now();
  try {
    const resp = await fetch(url);
    const durationMs = Date.now() - start;
    const data = await resp.json();
    if (!resp.ok) {
      const msg = typeof data === "object" ? data.msg : String(data);
      console.warn("Market klines failed", symbol, interval, resp.status, durationMs, msg);
      return { error: msg || `HTTP ${resp.status}` };
    }
    if (!Array.isArray(data)) {
      console.warn("Market klines unexpected format", symbol, durationMs);
      return { error: "Unexpected response format" };
    }
    console.log("Market klines OK", symbol, interval, data.length, durationMs, "ms");
    return { klines: data, symbol };
  } catch (err) {
    const durationMs = Date.now() - start;
    console.error("Market klines error", symbol, interval, durationMs, err.message);
    return { error: err.message };
  }
}
