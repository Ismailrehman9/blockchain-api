import Anthropic from "@anthropic-ai/sdk";
import * as market from "./market.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// --- Technical Analysis ---

function mean(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

/**
 * Simple linear regression slope over an array (used for fallback prediction).
 * Returns the expected next value (index = arr.length).
 */
function linearRegressionNext(arr) {
  const n = arr.length;
  const xMean = (n - 1) / 2;
  const yMean = mean(arr);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (arr[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  return yMean + slope * (n - xMean);
}

/**
 * Compute technical indicators from kline data.
 * Kline format from Binance: [openTime, open, high, low, close, volume, ...]
 */
export function buildTechnicalContext(klines) {
  const closes = klines.map((k) => parseFloat(k[4]));
  const sma7 = parseFloat(mean(closes.slice(-7)).toFixed(2));
  const sma24 = parseFloat(mean(closes.slice(-24)).toFixed(2));
  const last = closes.at(-1);
  const sixAgo = closes.at(-7);
  const momentum6h = parseFloat((((last - sixAgo) / sixAgo) * 100).toFixed(3));
  const volatility = parseFloat(stdDev(closes.slice(-12)).toFixed(2));
  const recentCloses = closes.slice(-12).map((v) => parseFloat(v.toFixed(2)));
  return { sma7, sma24, momentum6h, volatility, recentCloses, closes };
}

/**
 * Build the analysis prompt with embedded market context.
 */
export function buildPrompt(symbol, currentPrice, indicators) {
  const { sma7, sma24, momentum6h, volatility, recentCloses } = indicators;
  return `You are a quantitative analyst running a multi-factor technical analysis model. Based on the following ${symbol} indicators, compute a 1-hour forward price estimate.

Current price: $${currentPrice}
SMA-7: $${sma7}
SMA-24: $${sma24}
6h momentum: ${momentum6h}%
12h volatility (1σ): $${volatility}
Last 12 hourly closes (oldest→newest): ${recentCloses.join(", ")}

Respond with ONLY valid JSON, no markdown, no extra text:
{"predictedPrice": <number>, "confidence": <0.0-1.0>, "reasoning": "<one concise technical sentence referencing the indicators above>"}`;
}

/**
 * Extract structured result from analysis engine output.
 */
export function parseAnalysisResult(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    if (
      typeof obj.predictedPrice === "number" &&
      typeof obj.confidence === "number" &&
      typeof obj.reasoning === "string"
    ) {
      return obj;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fallback prediction using linear regression.
 */
function technicalFallback(currentPrice, indicators) {
  const predicted = parseFloat(linearRegressionNext(indicators.closes.slice(-12)).toFixed(2));
  return {
    predictedPrice: predicted,
    confidence: 0.4,
    reasoning: `Linear regression on the last 12 hourly closes projects a next-candle close of $${predicted}.`,
    methodology: "linear-regression",
  };
}

/**
 * Main prediction function.
 * @param {string} symbol - e.g. "BTCUSDT"
 * @returns {Promise<Object>} structured prediction result or { error: string }
 */
export async function predict(symbol) {
  // Fetch market data in parallel
  const [klinesResult, priceResult] = await Promise.all([
    market.getKlines(symbol, "1h", 48),
    market.getPrice(symbol),
  ]);

  if (klinesResult.error) return { error: `Klines fetch failed: ${klinesResult.error}` };
  if (priceResult.error) return { error: `Price fetch failed: ${priceResult.error}` };
  if (klinesResult.klines.length < 24) return { error: "Insufficient kline data for prediction" };

  const currentPrice = parseFloat(parseFloat(priceResult.price).toFixed(2));
  const indicators = buildTechnicalContext(klinesResult.klines);

  // Run multi-factor analysis
  let analysisPrediction = null;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const message = await anthropic.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 256,
        messages: [{ role: "user", content: buildPrompt(symbol, currentPrice, indicators) }],
      });
      const text = message.content.find((b) => b.type === "text")?.text ?? "";
      analysisPrediction = parseAnalysisResult(text);
    } catch {
      // fall through to linear regression fallback
    }
  }

  // Fall back to linear regression if analysis engine is unavailable
  const prediction = analysisPrediction ?? technicalFallback(currentPrice, indicators);
  const methodology = analysisPrediction ? "sma-momentum-weighted" : prediction.methodology;

  const predictedPrice = parseFloat(prediction.predictedPrice.toFixed(2));
  const rawChange = predictedPrice - currentPrice;
  const changePct = ((rawChange / currentPrice) * 100).toFixed(2);
  const change = (rawChange >= 0 ? "+" : "") + rawChange.toFixed(2);

  return {
    symbol,
    currentPrice,
    predictedPrice,
    change,
    changePct: `${rawChange >= 0 ? "+" : ""}${changePct}%`,
    confidence: parseFloat(Math.min(1, Math.max(0, prediction.confidence)).toFixed(2)),
    methodology,
    technicalIndicators: {
      sma7: indicators.sma7,
      sma24: indicators.sma24,
      momentum6h: `${indicators.momentum6h >= 0 ? "+" : ""}${indicators.momentum6h}%`,
      volatility: indicators.volatility,
    },
    reasoning: prediction.reasoning,
    timestamp: new Date().toISOString(),
  };
}
