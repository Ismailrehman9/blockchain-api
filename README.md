# BTC Price Prediction API

A Node.js/Express API that fetches live Bitcoin market data and returns a 1-hour price prediction using multi-factor technical analysis (SMA, momentum, volatility, linear regression).

---

## Setup

```bash
npm install
npm start
```

Server runs at `http://localhost:3002`

**Environment variables** (copy `.env.example` to `.env`):

```env
PORT=3002
ANTHROPIC_API_KEY=your_key_here
MARKET_SYMBOL=BTCUSDT
```

> `ANTHROPIC_API_KEY` is optional — without it the endpoint still works and falls back to linear regression (`methodology: "linear-regression"`).

---

## Endpoint

### `GET /api/predict/btc`

Returns the current BTC price and a 1-hour forward prediction based on technical indicators.

**Query params:**

| Param | Default | Description |
|-------|---------|-------------|
| `symbol` | `BTCUSDT` | Trading pair symbol (e.g. `ETHUSDT`, `SOLUSDT`) |

**Request:**
```bash
curl https://your-deployment-url/api/predict/btc
```

**Live response example:**
```json
{
  "symbol": "BTCUSDT",
  "currentPrice": 71426,
  "predictedPrice": 72530.16,
  "change": "+1104.16",
  "changePct": "+1.55%",
  "confidence": 0.4,
  "methodology": "linear-regression",
  "technicalIndicators": {
    "sma7": 72393.67,
    "sma24": 71411.73,
    "momentum6h": "-1.374%",
    "volatility": 596.45
  },
  "reasoning": "Linear regression on the last 12 hourly closes projects a next-candle close of $72530.16.",
  "timestamp": "2026-03-13T16:31:42.282Z"
}
```

**Response fields:**

| Field | Description |
|-------|-------------|
| `currentPrice` | Latest market price in USD |
| `predictedPrice` | Predicted price 1 hour from now |
| `change` | Absolute price change |
| `changePct` | Percentage change |
| `confidence` | Prediction confidence (0.0 – 1.0) |
| `methodology` | Algorithm used (`sma-momentum-weighted` or `linear-regression`) |
| `technicalIndicators.sma7` | 7-hour simple moving average |
| `technicalIndicators.sma24` | 24-hour simple moving average |
| `technicalIndicators.momentum6h` | 6-hour price momentum |
| `technicalIndicators.volatility` | 12-hour price volatility (1σ) |
| `reasoning` | Human-readable explanation of the prediction |
| `timestamp` | ISO 8601 timestamp of the prediction |

---

## Market Data Source

This API uses **Kraken** (public REST API, no key required) instead of Binance.

Binance restricts access from many cloud server regions (including US-based hosting providers like Vercel and Render). Kraken's public API has no geo-restrictions, no authentication requirement, and returns full OHLCV (open/high/low/close/volume) candle data at hourly intervals — providing higher-quality inputs for technical analysis than price-only data sources.

---

## Deploy to Vercel (free)

1. Push repo to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Add environment variables from `.env.example` in the Vercel dashboard
4. Deploy — no build command needed
