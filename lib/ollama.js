import { config } from "./config.js";

const { ollamaBaseUrl, ollamaModel, ollamaTimeoutMs } = config;

/**
 * Ping the Ollama server (GET /api/tags). Returns true if reachable, false otherwise.
 */
export async function ping() {
  const url = `${ollamaBaseUrl}/api/tags`;
  console.log("Ollama ping", url);
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ollamaTimeoutMs);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const durationMs = Date.now() - start;
    if (!resp.ok) {
      const body = await resp.text();
      console.warn("Ollama ping failed", resp.status, durationMs, body.slice(0, 200));
      return false;
    }
    console.log("Ollama ping OK", durationMs, "ms, model:", ollamaModel);
    return true;
  } catch (err) {
    const durationMs = Date.now() - start;
    console.warn("Ollama ping error", durationMs, err.message, ollamaBaseUrl);
    return false;
  }
}

/**
 * Generate a completion from Ollama (POST /api/generate).
 * @param {string} prompt - Full prompt text
 * @returns {Promise<{ response: string } | { error: string }>} - response or error
 */
export async function generate(prompt) {
  const url = `${ollamaBaseUrl}/api/generate`;
  const body = JSON.stringify({
    model: ollamaModel,
    prompt,
    stream: false,
  });
  console.log("Ollama generate", ollamaModel, "prompt length:", prompt?.length ?? 0);
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ollamaTimeoutMs);
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const durationMs = Date.now() - start;
    const rawBody = await resp.text();
    if (!resp.ok) {
      console.error("Ollama generate HTTP error", resp.status, durationMs, rawBody.slice(0, 300));
      return { error: `Ollama HTTP ${resp.status}: ${rawBody.slice(0, 200)}` };
    }
    let result;
    try {
      result = JSON.parse(rawBody);
    } catch (e) {
      console.error("Ollama generate parse error", durationMs, e.message);
      return { error: "Invalid JSON from Ollama" };
    }
    if (result.error) {
      console.warn("Ollama returned error field", result.error, durationMs);
      return { error: result.error };
    }
    console.log("Ollama generate OK", ollamaModel, durationMs, "ms, response length:", result.response?.length ?? 0);
    return { response: result.response ?? "" };
  } catch (err) {
    const durationMs = Date.now() - start;
    console.error("Ollama generate request failed", durationMs, err.message, ollamaBaseUrl);
    return { error: err.message };
  }
}
