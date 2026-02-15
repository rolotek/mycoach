import { createProviderRegistry } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI();

// Ollama's OpenAI-compatible API is at /v1 (chat/completions). Normalize /api -> /v1 so env works either way.
let ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1";
ollamaBaseUrl = ollamaBaseUrl.replace(/\/api\/?$/, "/v1");
if (!ollamaBaseUrl.endsWith("/v1")) {
  ollamaBaseUrl = `${ollamaBaseUrl.replace(/\/$/, "")}/v1`;
}
const ollama = createOpenAI({
  baseURL: ollamaBaseUrl,
  apiKey: "ollama",
});

export const registry = createProviderRegistry({
  anthropic,
  openai,
  ollama,
});
