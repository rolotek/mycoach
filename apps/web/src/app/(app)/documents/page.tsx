"use client";

import { useCallback, useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";

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
    <div className="max-w-3xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="Documents"
        description="Upload documents to inform your coaching sessions. Max 10MB per file."
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
        <input
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={onFileInput}
          className="hidden"
          id="doc-upload"
        />
        <label
          htmlFor="doc-upload"
          className="mt-2 block cursor-pointer text-muted-foreground hover:text-foreground"
        >
          {uploading
            ? "Uploading..."
            : "Drop a file here or click to select (PDF, DOCX, TXT)"}
        </label>
        {uploadError && (
          <p className="mt-2 text-sm text-destructive">{uploadError}</p>
        )}
      </div>

      <h2 className="text-lg font-medium">Your documents</h2>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : !documents?.length ? (
        <p className="text-muted-foreground">
          No documents uploaded yet. Upload PDFs, Word documents, or text files to give your coach more context.
        </p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li key={doc.id}>
              <Card>
                <CardContent className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-foreground">
                      {doc.filename}
                    </span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {formatSize(doc.size)} • {doc.mimeType}
                    </span>
                    <Badge
                      variant={
                        doc.status === "ready"
                          ? "default"
                          : doc.status === "error"
                            ? "destructive"
                            : "secondary"
                      }
                      className="ml-2"
                    >
                      {doc.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (window.confirm("Delete this document?")) {
                        deleteMut.mutate({ id: doc.id });
                      }
                    }}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
