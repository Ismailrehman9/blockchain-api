/**
 * Configuration from environment variables.
 */
export const config = {
  port: Number(process.env.PORT) || 3002,
  defaultSymbol: process.env.MARKET_SYMBOL || "BTCUSDT",
};
