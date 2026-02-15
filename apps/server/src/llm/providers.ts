import type { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, streamText } from "ai";
import { registry } from "./registry";
import { db } from "../db";
import { userSettings, userApiKeys } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { decrypt } from "../crypto/encryption";

export function getModel(modelId: string) {
  return registry.languageModel(
    modelId as
      | `anthropic:${string}`
      | `openai:${string}`
      | `google:${string}`
      | `ollama:${string}`
  );
}

/**
 * Create a per-request provider instance with the given API key.
 * modelId is the raw model id (e.g. "claude-sonnet-4-20250514"), not prefixed.
 */
export function getUserModel(
  provider: string,
  modelId: string,
  apiKey: string
): LanguageModel {
  switch (provider) {
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey });
      return anthropic(modelId) as LanguageModel;
    }
    case "openai": {
      const openai = createOpenAI({ apiKey });
      return openai(modelId) as LanguageModel;
    }
    case "google": {
      const google = createGoogleGenerativeAI({ apiKey });
      return google(modelId) as LanguageModel;
    }
    default:
      throw new Error(`Unsupported provider for user keys: ${provider}`);
  }
}

/**
 * Validate an API key by calling a read-only provider endpoint.
 */
export async function validateApiKey(
  provider: string,
  apiKey: string
): Promise<boolean> {
  try {
    if (provider === "anthropic") {
      const res = await fetch(
        "https://api.anthropic.com/v1/models?limit=1",
        {
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
        }
      );
      return res.ok;
    }
    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return res.ok;
    }
    if (provider === "google") {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
        { headers: { "x-goog-api-key": apiKey } }
      );
      return res.ok;
    }
    return false;
  } catch {
    return false;
  }
}

export interface ResolvedModel {
  model: LanguageModel;
  provider: string;
  modelName: string;
  usingUserKey: boolean;
}

/** Thrown when a cloud provider is selected but the user has not set an API key. */
export class ApiKeyRequiredError extends Error {
  constructor(
    public readonly provider: string,
    message: string
  ) {
    super(message);
    this.name = "ApiKeyRequiredError";
  }
}

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google (Gemini)",
};

/**
 * Resolve the model to use for a user: agent override -> user default -> env.
 * For anthropic/openai/google, requires the user to have set their own API key; no env fallback.
 */
export async function resolveUserModel(
  userId: string,
  agentPreferredModel?: string | null
): Promise<ResolvedModel> {
  let prefixedModelId =
    agentPreferredModel ??
    (await db.select().from(userSettings).where(eq(userSettings.userId, userId)))
      ?.[0]?.preferredModel ??
    process.env.COACH_CHAT_MODEL ??
    `ollama:${process.env.OLLAMA_MODEL ?? "llama3.1:8b"}`;

  if (prefixedModelId === "ollama:llama3.1") {
    prefixedModelId = "ollama:llama3.1:8b";
  }

  const colonIndex = prefixedModelId.indexOf(":");
  const provider =
    colonIndex >= 0 ? prefixedModelId.slice(0, colonIndex) : "ollama";
  const modelName =
    colonIndex >= 0 ? prefixedModelId.slice(colonIndex + 1) : prefixedModelId;

  if (provider === "anthropic" || provider === "openai" || provider === "google") {
    const [keyRow] = await db
      .select()
      .from(userApiKeys)
      .where(
        and(
          eq(userApiKeys.userId, userId),
          eq(userApiKeys.provider, provider)
        )
      );
    if (!keyRow?.encryptedKey) {
      const displayName = PROVIDER_DISPLAY_NAMES[provider] ?? provider;
      throw new ApiKeyRequiredError(
        provider,
        `Please add your ${displayName} API key in Settings to use this model.`
      );
    }
    const decryptedKey = decrypt(keyRow.encryptedKey);
    return {
      model: getUserModel(provider, modelName, decryptedKey),
      provider,
      modelName,
      usingUserKey: true,
    };
  }

  return {
    model: getModel(prefixedModelId),
    provider,
    modelName,
    usingUserKey: false,
  };
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
      id: "google",
      name: "Google (Gemini)",
      requiresApiKey: true,
      envVar: "GOOGLE_GENERATIVE_AI_API_KEY",
      models: [
        { id: "google:gemini-2.0-flash", name: "Gemini 2.0 Flash" },
        { id: "google:gemini-1.5-pro", name: "Gemini 1.5 Pro" },
        { id: "google:gemini-1.5-flash", name: "Gemini 1.5 Flash" },
      ],
    },
    {
      id: "ollama",
      name: "Ollama (Local)",
      requiresApiKey: false,
      envVar: null,
      models: [
        { id: "ollama:llama3.1:8b", name: "Llama 3.1 8B" },
        { id: "ollama:mistral", name: "Mistral" },
      ],
    },
  ];
}
