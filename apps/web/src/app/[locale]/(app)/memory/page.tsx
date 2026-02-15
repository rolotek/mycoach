"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";

function categoryStyle(cat: string): string {
  const map: Record<string, string> = {
    goal: "bg-green-500/10 text-green-700 dark:text-green-400",
    preference: "bg-primary/10 text-primary",
    context: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
    relationship: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    work: "bg-muted text-muted-foreground",
    personal: "bg-pink-500/10 text-pink-700 dark:text-pink-400",
  };
  return map[cat] ?? "bg-muted text-muted-foreground";
}

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
    <div className="max-w-3xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="What I Know About You"
        description="Facts extracted from our conversations. You can edit or remove any."
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : Object.keys(byCategory).length === 0 ? (
        <p className="text-muted-foreground">
          No facts recorded yet. Start a coaching conversation and I&apos;ll learn about you.
        </p>
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => {
            const list = byCategory[cat];
            if (!list?.length) return null;
            return (
              <section key={cat}>
                <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  {cat} ({list.length})
                </h2>
                <div className="space-y-2">
                  {list.map((f) => (
                    <Card key={f.id}>
                      <CardContent className="pt-4">
                        {editingId === f.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              rows={2}
                              className="min-h-[60px]"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  updateMut.mutate({
                                    id: f.id,
                                    fact: editText,
                                  });
                                  setEditingId(null);
                                }}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditText("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-foreground">{f.fact}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge
                                  variant="outline"
                                  className={categoryStyle(f.category)}
                                >
                                  {f.category}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {f.confidence != null
                                    ? `${Math.round(f.confidence * 100)}%`
                                    : ""}
                                </span>
                                {f.source && (
                                  <span className="text-xs text-muted-foreground">
                                    {f.source}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditingId(f.id);
                                  setEditText(f.fact);
                                }}
                                aria-label="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Remove this fact from your profile?"
                                    )
                                  ) {
                                    deleteMut.mutate({ id: f.id });
                                  }
                                }}
                                aria-label="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
