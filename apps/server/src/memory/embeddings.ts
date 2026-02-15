import { embed, embedMany } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

/** DB schema expects 1536. OpenAI returns 1536; Ollama (nomic-embed-text) returns 768 — we pad to 1536. */
const EMBED_DIMENSIONS = 1536;
const OLLAMA_EMBED_DIMS = 768;

function getEmbeddingModel() {
  if (process.env.OPENAI_API_KEY?.trim()) {
    return createOpenAI().embedding("text-embedding-3-small");
  }
  return null;
}

const openaiEmbeddingModel = getEmbeddingModel();

function ollamaBase(): string {
  const url = process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1";
  return url.replace(/\/v1\/?$|\/api\/?$/, "") || "http://localhost:11434";
}

const ollamaEmbedModel =
  process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";

function padTo1536(vec: number[]): number[] {
  if (vec.length >= EMBED_DIMENSIONS) return vec.slice(0, EMBED_DIMENSIONS);
  return [...vec, ...Array(EMBED_DIMENSIONS - vec.length).fill(0)];
}

async function embedWithOllama(input: string | string[]): Promise<number[][]> {
  const base = ollamaBase();
  const res = await fetch(`${base}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ollamaEmbedModel,
      input: input,
      dimensions: OLLAMA_EMBED_DIMS,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama embed failed ${res.status}: ${body}`);
  }
  const data = (await res.json()) as { embeddings: number[][] };
  return data.embeddings.map(padTo1536);
}

export async function embedText(text: string): Promise<number[]> {
  if (openaiEmbeddingModel) {
    const { embedding } = await embed({
      model: openaiEmbeddingModel,
      value: text,
    });
    return embedding as number[];
  }
  const [vec] = await embedWithOllama(text);
  return vec;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (openaiEmbeddingModel) {
    const { embeddings } = await embedMany({
      model: openaiEmbeddingModel,
      values: texts,
    });
    return embeddings as number[][];
  }
  return embedWithOllama(texts);
}
