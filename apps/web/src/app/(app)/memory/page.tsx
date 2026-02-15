"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

const CATEGORY_COLORS: Record<string, string> = {
  goal: "bg-green-100 text-green-800",
  preference: "bg-blue-100 text-blue-800",
  context: "bg-purple-100 text-purple-800",
  relationship: "bg-orange-100 text-orange-800",
  work: "bg-slate-100 text-slate-800",
  personal: "bg-pink-100 text-pink-800",
};

export default function MemoryPage() {
  const utils = trpc.useUtils();
  const { data: facts, isLoading } = trpc.userFact.list.useQuery();
  const updateMut = trpc.userFact.update.useMutation({
    onSuccess: () => utils.userFact.list.invalidate(),
  });
  const deleteMut = trpc.userFact.delete.useMutation({
    onSuccess: () => utils.userFact.list.invalidate(),
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const byCategory = (facts ?? []).reduce<
    Record<string, NonNullable<typeof facts>>
  >((acc, f) => {
    const cat = f.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {} as Record<string, NonNullable<typeof facts>>);

  const categories = [
    "goal",
    "preference",
    "context",
    "relationship",
    "work",
    "personal",
  ];

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold text-neutral-900">
          What I Know About You
        </h1>
        <p className="mt-1 text-neutral-600">
          Facts extracted from our conversations. You can edit or remove any.
        </p>

        {isLoading ? (
          <p className="mt-6 text-neutral-500">Loading...</p>
        ) : Object.keys(byCategory).length === 0 ? (
          <p className="mt-6 text-neutral-500">
            No facts recorded yet. Start a coaching conversation and I'll learn
            about you.
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            {categories.map((cat) => {
              const list = byCategory[cat];
              if (!list?.length) return null;
              return (
                  <section key={cat}>
                    <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">
                      {cat} ({list.length})
                    </h2>
                    <div className="space-y-2">
                      {list.map((f) => (
                        <div
                          key={f.id}
                          className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
                        >
                          {editingId === f.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full rounded border border-neutral-300 p-2 text-sm"
                                rows={2}
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateMut.mutate({
                                      id: f.id,
                                      fact: editText,
                                    });
                                    setEditingId(null);
                                  }}
                                  className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditText("");
                                  }}
                                  className="rounded border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-neutral-900">{f.fact}</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <span
                                    className={`rounded px-2 py-0.5 text-xs ${
                                      CATEGORY_COLORS[f.category] ?? "bg-neutral-100"
                                    }`}
                                  >
                                    {f.category}
                                  </span>
                                  <span className="text-xs text-neutral-500">
                                    {f.confidence != null
                                      ? `${Math.round(f.confidence * 100)}%`
                                      : ""}
                                  </span>
                                  {f.source && (
                                    <span className="text-xs text-neutral-500">
                                      {f.source}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(f.id);
                                    setEditText(f.fact);
                                  }}
                                  className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
                                  aria-label="Edit"
                                >
                                  ✎
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        "Remove this fact from your profile?"
                                      )
                                    ) {
                                      deleteMut.mutate({ id: f.id });
                                    }
                                  }}
                                  className="rounded p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-600"
                                  aria-label="Delete"
                                >
                                  🗑
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
