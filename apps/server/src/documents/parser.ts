import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";

const SUPPORTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
] as const;

export type SupportedMimeType = (typeof SUPPORTED_TYPES)[number];

export function isSupportedType(
  mimeType: string
): mimeType is SupportedMimeType {
  return (SUPPORTED_TYPES as readonly string[]).includes(mimeType);
}

export async function parseDocument(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  switch (mimeType) {
    case "application/pdf": {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdf, { mergePages: true });
      return Array.isArray(text) ? text.join("\n") : (text as string);
    }
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      const { value } = await mammoth.extractRawText({ buffer });
      return value;
    }
    case "text/plain":
      return buffer.toString("utf-8");
    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}
