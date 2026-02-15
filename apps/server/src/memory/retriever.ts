import { cosineDistance } from "drizzle-orm";
import { desc, eq, and, sql } from "drizzle-orm";
import { db } from "../db";
import { memories } from "../db/schema";
import { embedText } from "./embeddings";

export async function retrieveContext(
  userId: string,
  query: string,
  limit: number = 10,
  minSimilarity: number = 0.3
): Promise<Array<{ content: string; similarity: number; type: string }>> {
  if (!query.trim()) return [];

  try {
    const embedding = await embedText(query);
    const distance = cosineDistance(memories.embedding, embedding);
    const similarityExpr = sql<number>`(1 - (${distance}))`;

    const results = await db
      .select({
        content: memories.content,
        similarity: similarityExpr,
        type: memories.type,
      })
      .from(memories)
      .where(
        and(
          eq(memories.userId, userId),
          sql`(1 - (${distance})) > ${minSimilarity}`
        )
      )
      .orderBy(desc(similarityExpr))
      .limit(limit);

    return results.map((r) => ({
      content: r.content,
      similarity: Number(r.similarity),
      type: r.type,
    }));
  } catch (err) {
    console.error(
      "Context retrieval failed (embeddings may be unavailable):",
      err
    );
    return [];
  }
}
