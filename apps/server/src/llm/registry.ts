import { createProviderRegistry } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI();

// Ollama via OpenAI-compatible API (ollama-ai-provider-v2 has zod 4 peer conflict)
const ollama = createOpenAI({
  baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
  apiKey: "ollama",
});

export const registry = createProviderRegistry({
  anthropic,
  openai,
  ollama,
});
