"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";

export default function AgentsPage() {
  const utils = trpc.useUtils();
  const { data: agents, isLoading } = trpc.agent.listAll.useQuery();
  const createMut = trpc.agent.create.useMutation({
    onSuccess: () => utils.agent.listAll.invalidate(),
  });
  const updateMut = trpc.agent.update.useMutation({
    onSuccess: () => {
      utils.agent.listAll.invalidate();
      setEditingId(null);
    },
  });
  const deleteMut = trpc.agent.delete.useMutation({
    onSuccess: () => utils.agent.listAll.invalidate(),
  });
  const archiveMut = trpc.agent.archive.useMutation({
    onSuccess: () => utils.agent.listAll.invalidate(),
  });
  const unarchiveMut = trpc.agent.unarchive.useMutation({
    onSuccess: () => utils.agent.listAll.invalidate(),
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSystemPrompt, setFormSystemPrompt] = useState("");
  const [formIcon, setFormIcon] = useState("");

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormSystemPrompt("");
    setFormIcon("");
    setEditingId(null);
    setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (a: NonNullable<typeof agents>[number]) => {
    setEditingId(a.id);
    setFormName(a.name);
    setFormDescription(a.description);
    setFormSystemPrompt(a.systemPrompt);
    setFormIcon(a.icon ?? "");
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formName.trim() || !formDescription.trim() || !formSystemPrompt.trim())
      return;
    if (editingId) {
      updateMut.mutate({
        id: editingId,
        name: formName.trim(),
        description: formDescription.trim().slice(0, 500),
        systemPrompt: formSystemPrompt.trim(),
        icon: formIcon.trim() || undefined,
      });
    } else {
      createMut.mutate({
        name: formName.trim().slice(0, 100),
        description: formDescription.trim().slice(0, 500),
        systemPrompt: formSystemPrompt.trim(),
        icon: formIcon.trim() || undefined,
      });
      resetForm();
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this agent?")) return;
    deleteMut.mutate({ id });
  };

  return (
    <div className="max-w-5xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="Agents"
        description="Your specialist agent library"
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Button>
        }
      />

      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Agent" : "New Agent"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update agent details." : "Create a new specialist agent."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Name</Label>
              <Input
                id="agent-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                maxLength={100}
                placeholder="e.g. Contract Attorney"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-desc">Description</Label>
              <Textarea
                id="agent-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="What this agent does"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-prompt">System prompt</Label>
              <Textarea
                id="agent-prompt"
                value={formSystemPrompt}
                onChange={(e) => setFormSystemPrompt(e.target.value)}
                rows={6}
                placeholder="Instructions for the agent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-icon">Icon (optional)</Label>
              <Input
                id="agent-icon"
                value={formIcon}
                onChange={(e) => setFormIcon(e.target.value)}
                placeholder="e.g. 📄 or scales"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSave}
              disabled={
                !formName.trim() ||
                !formDescription.trim() ||
                !formSystemPrompt.trim() ||
                createMut.isPending ||
                updateMut.isPending
              }
            >
              Save
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !agents?.length ? (
        <p className="text-center text-muted-foreground">
          No agents yet. Create one or your starter templates will appear when you open this page.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {agents.map((a) => (
            <Card
              key={a.id}
              className={cn("transition-colors", a.archivedAt && "opacity-60")}
            >
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  {a.icon && <span className="text-lg" aria-hidden>{a.icon}</span>}
                  <CardTitle className="text-base">
                    <Link href={`/agents/${a.id}`} className="hover:underline">
                      {a.name}
                    </Link>
                  </CardTitle>
                  {a.isStarter && <Badge variant="secondary">Starter</Badge>}
                  {a.archivedAt && <Badge variant="outline">Archived</Badge>}
                </div>
                <CardDescription className="line-clamp-2">{a.description}</CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-wrap gap-2">
                {!a.archivedAt && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => archiveMut.mutate({ id: a.id })}>
                      Archive
                    </Button>
                  </>
                )}
                {a.archivedAt && (
                  <Button variant="ghost" size="sm" onClick={() => unarchiveMut.mutate({ id: a.id })}>
                    Unarchive
                  </Button>
                )}
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/agents/${a.id}`}>View History</Link>
                </Button>
                {!a.archivedAt && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(a.id)}
                  >
                    Delete
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
