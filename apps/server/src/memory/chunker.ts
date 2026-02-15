export function chunkText(
  text: string,
  maxChunkSize: number = 500,
  overlap: number = 50
): string[] {
  if (!text || text.trim().length === 0) return [];
  if (text.length <= maxChunkSize) return [text.trim()];

  const separators = ["\n\n", "\n", ". ", " "];

  function splitWithSeparator(text: string, sepIndex: number): string[] {
    if (text.length <= maxChunkSize) return [text];
    if (sepIndex >= separators.length) {
      const chunks: string[] = [];
      for (let i = 0; i < text.length; i += maxChunkSize - overlap) {
        chunks.push(text.slice(i, i + maxChunkSize));
      }
      return chunks;
    }

    const sep = separators[sepIndex];
    const parts = text.split(sep);
    const result: string[] = [];
    let current = "";

    for (const part of parts) {
      const candidate = current ? current + sep + part : part;
      if (candidate.length > maxChunkSize && current) {
        result.push(current.trim());
        current = current.slice(-overlap) + sep + part;
      } else {
        current = candidate;
      }
    }
    if (current.trim()) result.push(current.trim());

    return result.flatMap((chunk) =>
      chunk.length > maxChunkSize
        ? splitWithSeparator(chunk, sepIndex + 1)
        : [chunk]
    );
  }

  return splitWithSeparator(text, 0).filter((c) => c.length > 0);
}
