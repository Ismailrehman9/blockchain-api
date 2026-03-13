/**
 * Configuration from environment. Used by server, ollama, and market modules.
 */
export const config = {
  port: Number(process.env.PORT) || 3002,
  ollamaBaseUrl: (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, ""),
  ollamaModel: process.env.OLLAMA_MODEL || "llama3.2",
  ollamaTimeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS) || 120000,
  binanceBaseUrl: (process.env.BINANCE_BASE_URL || "https://api.binance.com").replace(/\/$/, ""),
  defaultSymbol: process.env.MARKET_SYMBOL || "BTCUSDT",
};
