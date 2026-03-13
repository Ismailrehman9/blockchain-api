import { config } from "./config.js";

const COINGECKO = "https://api.coingecko.com/api/v3";
const { defaultSymbol } = config;

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
  const url = `${COINGECKO}/simple/price?ids=${id}&vs_currencies=usd`;
  const start = Date.now();
  try {
    const resp = await fetch(url);
    const durationMs = Date.now() - start;
    const data = await resp.json();
    if (!resp.ok || !data[id]) {
      console.warn("Market price failed", symbol, resp.status, durationMs);
      return { error: `Failed to fetch price for ${symbol}` };
    }
    const price = data[id].usd.toString();
    console.log("Market price OK", symbol, price, durationMs, "ms");
    return { price, symbol };
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
  const days = Math.ceil(limit / 24) + 1;
  const url = `${COINGECKO}/coins/${id}/market_chart?vs_currency=usd&days=${days}`;
  const start = Date.now();
  try {
    const resp = await fetch(url);
    const durationMs = Date.now() - start;
    const data = await resp.json();
    if (!resp.ok || !Array.isArray(data.prices)) {
      console.warn("Market klines failed", symbol, resp.status, durationMs);
      return { error: `Failed to fetch klines for ${symbol}` };
    }
    // Convert [timestamp, price] → [openTime, open, high, low, close, volume]
    const klines = data.prices.slice(-limit).map(([ts, price]) => [ts, price, price, price, price, 0]);
    console.log("Market klines OK", symbol, klines.length, durationMs, "ms");
    return { klines, symbol };
  } catch (err) {
    console.error("Market klines error", symbol, err.message);
    return { error: err.message };
  }
}
