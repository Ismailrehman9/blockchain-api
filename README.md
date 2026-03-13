# BTC Price Prediction API

A Node.js/Express API that fetches live Bitcoin market data and returns a 1-hour price prediction with confidence score and reasoning.

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
ANTHROPIC_API_KEY=your_key_here   # get from console.anthropic.com
BINANCE_BASE_URL=https://api.binance.com
MARKET_SYMBOL=BTCUSDT
```

> Without `ANTHROPIC_API_KEY` the endpoint still works — it falls back to linear regression (`methodology: "linear-regression"`).

---

## Endpoint

### `GET /api/predict/btc`

Returns the current BTC price and a 1-hour forward prediction.

**Query params:**

| Param | Default | Description |
|-------|---------|-------------|
| `symbol` | `BTCUSDT` | Any Binance spot pair (e.g. `ETHUSDT`) |

**Request:**
```bash
curl http://localhost:3002/api/predict/btc
```

**Response:**
```json
{
  "symbol": "BTCUSDT",
  "currentPrice": 84200.10,
  "predictedPrice": 84560.00,
  "change": "+359.90",
  "changePct": "+0.43%",
  "confidence": 0.65,
  "methodology": "sma-momentum-weighted",
  "technicalIndicators": {
    "sma7": 83900.00,
    "sma24": 82500.00,
    "momentum6h": "+0.82%",
    "volatility": 410.50
  },
  "reasoning": "Price is trading above SMA-7 and SMA-24 with positive 6h momentum.",
  "timestamp": "2026-03-13T20:38:00.000Z"
}
```

---

## Deploy to Render (free)

1. Push repo to GitHub
2. Create a Web Service on [render.com](https://render.com)
3. Build command: `npm install` — Start command: `npm start`
4. Add env vars from `.env.example`
# blockchain-api
# blockchain-api
