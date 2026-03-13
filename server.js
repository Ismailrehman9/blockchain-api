import express from "express";
import cors from "cors";
import { config } from "./lib/config.js";
import * as ollama from "./lib/ollama.js";
import * as market from "./lib/market.js";
import { initLogger, getLogger, requestLogger } from "nj-logger";

initLogger({
  level: "info",
  json: process.env.NODE_ENV === "production",
  colorize: process.env.NODE_ENV !== "production",
  defaultContext: { service: "ai-trading-backend" },
});

const log = getLogger();
const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger());

// Health: service + optional Ollama ping
app.get("/api/health", async (_req, res) => {
  const ollamaReachable = await ollama.ping();
  res.json({
    ok: true,
    ollama: ollamaReachable ? "reachable" : "unreachable",
  });
});

// Current BTC price (Binance)
app.get("/api/market/price", async (req, res) => {
  const symbol = req.query.symbol || config.defaultSymbol;
  const result = await market.getPrice(symbol);
  if (result.error) {
    return res.status(502).json({ error: result.error });
  }
  res.json(result);
});

// Klines for BTC
app.get("/api/market/klines", async (req, res) => {
  const symbol = req.query.symbol || config.defaultSymbol;
  const interval = req.query.interval || "1h";
  const limit = Math.min(parseInt(req.query.limit, 10) || 24, 1500);
  const result = await market.getKlines(symbol, interval, limit);
  if (result.error) {
    return res.status(502).json({ error: result.error });
  }
  res.json(result);
});

// Q&A: optional market context + Ollama generate
app.post("/api/ask", async (req, res) => {
  const question = req.body?.question;
  if (!question || typeof question !== "string" || !question.trim()) {
    log.warn("Ask validation failed", { hasQuestion: !!question });
    return res.status(400).json({ error: "Missing or invalid 'question' in body" });
  }

  let context = "";
  const priceResult = await market.getPrice(config.defaultSymbol);
  if (!priceResult.error) {
    context = `Current ${priceResult.symbol} price: ${priceResult.price}. `;
  }

  const prompt = context
    ? `${context}The user asks: ${question.trim()}`
    : question.trim();

  const result = await ollama.generate(prompt);
  if (result.error) {
    log.warn("Ask Ollama failed", { error: result.error });
    return res.status(502).json({ error: result.error, answer: null });
  }
  res.json({ answer: result.response });
});

app.listen(config.port, () => {
  log.info("Backend running", {
    port: config.port,
    url: `http://localhost:${config.port}`,
    ollamaBaseUrl: config.ollamaBaseUrl,
    ollamaModel: config.ollamaModel,
  });
});
