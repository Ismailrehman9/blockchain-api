# AI Bitcoin Trading Backend Assessment

Backend-only take-home assessment: build a Node.js Express API that fetches Bitcoin market data, integrates a local **Ollama** model for Q&A (and optional prediction-style prompts).

---

## 1. Prerequisites

- **Node 18+** and npm
- **Ollama** installed and running locally (e.g. `http://localhost:11434`)
- A model already pulled (e.g. `llama3.2`, `llama3.2:1b`, `phi3`, or `mistral`). No model download is required during the assessment.

---

## 2. Candidate question: market data source

**Which market data source do you want to use?** (e.g. Binance public API for spot/klines, or another exchange/API you're comfortable with). Please document your choice in `NOTES.md` and note any API keys if required.

**Default suggestion:** Binance **public** REST API (no keys needed for price/klines):

- Ticker: `GET https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT`
- Klines: `GET https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24`
- Docs: [Binance Spot API](https://developers.binance.com/docs/binance-spot-api-docs/rest-api)

---

## 3. Setup and run

```bash
cd backend-ai-assessment
npm install
npm start
```

Server runs at `http://localhost:3002` by default (or set `PORT`). Optional env vars:

- `OLLAMA_BASE_URL` – default `http://localhost:11434`
- `OLLAMA_MODEL` – default `llama3.2`
- `PORT` – default `3002`
- `BINANCE_BASE_URL` – default `https://api.binance.com` (or your chosen API base)

See `.env.example` for a template.

---

## 4. API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Service health; optionally pings Ollama. Returns `{ ok, ollama?: "reachable" \| "unreachable" }`. |
| GET | `/api/market/price` | Current BTC price (symbol configurable, e.g. BTCUSDT). |
| GET | `/api/market/klines` | Query params: `interval` (e.g. `1h`), `limit` (e.g. `24`). Returns klines for BTC. |
| POST | `/api/ask` | Body: `{ "question": "string" }`. Optionally includes latest price/klines in context; calls Ollama; returns `{ "answer": "..." }`. |

---

## 5. Evaluation criteria

- **Market integration:** Correct use of your chosen API (e.g. Binance klines/price), error handling, and logging of requests.
- **Ollama integration:** Health check and at least one Q&A endpoint that sends a prompt (with optional market context) to Ollama and returns the response; timeout/error handling and logging.
- **Logging:** Consistent use of the project logger; structured fields (request id, duration, model, etc.); no console.* for application logging.
- **Code quality:** Clear separation (e.g. `lib/ollama.js`, `lib/market.js`), env-based config, and a short `NOTES.md` with your design choices and how you'd extend it (e.g. streaming, caching).

---

## 6. Hosting and submission

- **Host with nginx:** Deploy the application behind **nginx** (e.g. as a reverse proxy to the Node process) and ensure all API routes are reachable.
- **Share the hosted URL:** Provide the public URL of your deployed backend so we can test the APIs (health, market, ask) against your live service.
- **Code:** Ensure the app runs locally (`npm install` then `npm start`, with Ollama running if using `/api/health` or `/api/ask`). Include a short `NOTES.md` with your market API choice, design goals, trade-offs, and any known issues.
- Submit the `assessment-ai-backend` folder (excluding `node_modules`).
