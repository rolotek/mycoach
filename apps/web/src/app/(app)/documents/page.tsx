"use client";

import { useCallback, useState } from "react";
import { trpc } from "@/lib/trpc";

const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function uploadDocument(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${SERVER_URL}/api/documents/upload`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Upload failed");
  }
  return res.json();
}

export default function DocumentsPage() {
  const utils = trpc.useUtils();
  const { data: documents, isLoading } = trpc.document.list.useQuery();
  const deleteMut = trpc.document.delete.useMutation({
    onSuccess: () => utils.document.list.invalidate(),
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setUploadError(null);
      setUploading(true);
      try {
        await uploadDocument(file);
        utils.document.list.invalidate();
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [utils]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold text-neutral-900">Documents</h1>
        <p className="mt-1 text-neutral-600">
          Upload documents to inform your coaching sessions. Max 10MB per file.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`mt-6 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragOver ? "border-blue-400 bg-blue-50" : "border-neutral-300"
          } ${uploading ? "pointer-events-none opacity-60" : ""}`}
        >
          <input
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={onFileInput}
            className="hidden"
            id="doc-upload"
          />
          <label
            htmlFor="doc-upload"
            className="cursor-pointer text-neutral-600 hover:text-neutral-900"
          >
            {uploading
              ? "Uploading..."
              : "Drop a file here or click to select (PDF, DOCX, TXT)"}
          </label>
          {uploadError && (
            <p className="mt-2 text-sm text-red-600">{uploadError}</p>
          )}
        </div>

        <h2 className="mt-8 text-lg font-medium text-neutral-900">
          Your documents
        </h2>
        {isLoading ? (
          <p className="mt-2 text-neutral-500">Loading...</p>
        ) : !documents?.length ? (
          <p className="mt-2 text-neutral-500">
            No documents uploaded yet. Upload PDFs, Word documents, or text files
            to give your coach more context.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-neutral-900">
                    {doc.filename}
                  </span>
                  <span className="ml-2 text-sm text-neutral-500">
                    {formatSize(doc.size)} • {doc.mimeType}
                  </span>
                  <span
                    className={`ml-2 rounded px-2 py-0.5 text-xs ${
                      doc.status === "ready"
                        ? "bg-green-100 text-green-800"
                        : doc.status === "error"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {doc.status}
                  </span>
                </div>
                <span className="text-xs text-neutral-400">
                  {new Date(doc.createdAt).toLocaleDateString()}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Delete this document?")) {
                      deleteMut.mutate({ id: doc.id });
                    }
                  }}
                  className="ml-2 rounded p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete"
                >
                  🗑
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
