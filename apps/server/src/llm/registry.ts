import { createProviderRegistry } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI();

// Ollama's OpenAI-compatible API is at /v1 (chat/completions). Use .chat() so we hit /chat/completions
// instead of /responses; the Responses API uses item_reference in input, which Ollama does not support.
let ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1";
ollamaBaseUrl = ollamaBaseUrl.replace(/\/api\/?$/, "/v1");
if (!ollamaBaseUrl.endsWith("/v1")) {
  ollamaBaseUrl = `${ollamaBaseUrl.replace(/\/$/, "")}/v1`;
}
const ollamaBase = createOpenAI({
  baseURL: ollamaBaseUrl,
  apiKey: "ollama",
});
const ollama = {
  ...ollamaBase,
  languageModel: (modelId: string) => ollamaBase.chat(modelId),
};

export const registry = createProviderRegistry({
  anthropic,
  openai,
  ollama,
});
