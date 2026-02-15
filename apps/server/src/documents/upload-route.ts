import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { documents, memories } from "../db/schema";
import { parseDocument, isSupportedType } from "./parser";
import { chunkText } from "../memory/chunker";
import { embedTexts } from "../memory/embeddings";
import { auth } from "../auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const documentsApp = new Hono<{
  Variables: {
    user: (typeof auth)["$Infer"]["Session"]["user"] | null;
    session: (typeof auth)["$Infer"]["Session"]["session"] | null;
  };
}>();

documentsApp.post("/api/documents/upload", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.parseBody();
  const file = body["file"] as File | undefined;

  if (!file) return c.json({ error: "No file provided" }, 400);
  if (file.size > MAX_FILE_SIZE) {
    return c.json({ error: "File too large (max 10MB)" }, 400);
  }
  if (!isSupportedType(file.type)) {
    return c.json(
      {
        error: `Unsupported file type: ${file.type}. Supported: PDF, DOCX, TXT`,
      },
      400
    );
  }

  const [doc] = await db
    .insert(documents)
    .values({
      userId: user.id,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      status: "processing",
    })
    .returning();

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await parseDocument(buffer, file.type);

    await db
      .update(documents)
      .set({ content: text })
      .where(eq(documents.id, doc.id));

    const chunks = chunkText(text, 500, 50);

    if (chunks.length > 0) {
      let embeddings: number[][] | null = null;
      try {
        embeddings = await embedTexts(chunks);
      } catch (err) {
        console.error("Embedding generation failed for document:", err);
      }

      const memoryValues = chunks.map((chunk, i) => ({
        userId: user.id,
        content: chunk,
        embedding: embeddings?.[i] ?? null,
        type: "document_chunk" as const,
        metadata: {
          documentId: doc.id,
          filename: file.name,
          chunkIndex: i,
        },
      }));

      for (let i = 0; i < memoryValues.length; i += 50) {
        await db.insert(memories).values(memoryValues.slice(i, i + 50));
      }
    }

    await db
      .update(documents)
      .set({ status: "ready" })
      .where(eq(documents.id, doc.id));

    return c.json({
      id: doc.id,
      filename: file.name,
      status: "ready",
      chunks: chunks.length,
    });
  } catch (err) {
    await db
      .update(documents)
      .set({ status: "error" })
      .where(eq(documents.id, doc.id));
    console.error("Document processing failed:", err);
    return c.json({ error: "Failed to process document" }, 500);
  }
});

export { documentsApp };
