import { generateText, streamText } from "ai";
import { registry } from "./registry";

export function getModel(modelId: string) {
  return registry.languageModel(
    modelId as `anthropic:${string}` | `openai:${string}` | `ollama:${string}`
  );
}

export async function chat(
  modelId: string,
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>
): Promise<{ text: string }> {
  const result = await generateText({
    model: getModel(modelId),
    messages,
  });
  return { text: result.text };
}

export function chatStream(
  modelId: string,
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>
) {
  return streamText({
    model: getModel(modelId),
    messages,
  }) as unknown as {
    stream: AsyncIterable<unknown>;
    text: Promise<string>;
  };
}

export function getAvailableProviders() {
  return [
    {
      id: "anthropic",
      name: "Anthropic (Claude)",
      requiresApiKey: true,
      envVar: "ANTHROPIC_API_KEY",
      models: [
        { id: "anthropic:claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
        { id: "anthropic:claude-haiku-3-20250414", name: "Claude Haiku 3" },
      ],
    },
    {
      id: "openai",
      name: "OpenAI",
      requiresApiKey: true,
      envVar: "OPENAI_API_KEY",
      models: [
        { id: "openai:gpt-4o", name: "GPT-4o" },
        { id: "openai:gpt-4o-mini", name: "GPT-4o Mini" },
      ],
    },
    {
      id: "ollama",
      name: "Ollama (Local)",
      requiresApiKey: false,
      envVar: null,
      models: [
        { id: "ollama:llama3.1", name: "Llama 3.1" },
        { id: "ollama:mistral", name: "Mistral" },
      ],
    },
  ];
}
