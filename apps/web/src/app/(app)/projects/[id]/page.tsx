"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MessageSquare,
  Plus,
  Trash2,
  ExternalLink,
  GripVertical,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}

export default function ProjectDetailPage() {
  const id = useParams().id as string;
  const utils = trpc.useUtils();
  const { data: project, isLoading } = trpc.project.get.useQuery(
    { id },
    { enabled: !!id }
  );
  const { data: documents } = trpc.document.list.useQuery();

  const updateProject = trpc.project.update.useMutation({
    onSuccess: () => utils.project.get.invalidate({ id }),
  });
  const addDocument = trpc.project.addDocument.useMutation({
    onSuccess: () => utils.project.get.invalidate({ id }),
  });
  const removeDocument = trpc.project.removeDocument.useMutation({
    onSuccess: () => utils.project.get.invalidate({ id }),
  });
  const addLink = trpc.project.addLink.useMutation({
    onSuccess: () => utils.project.get.invalidate({ id }),
  });
  const removeLink = trpc.project.removeLink.useMutation({
    onSuccess: () => utils.project.get.invalidate({ id }),
  });
  const createMilestone = trpc.project.createMilestone.useMutation({
    onSuccess: () => utils.project.get.invalidate({ id }),
  });
  const updateMilestone = trpc.project.updateMilestone.useMutation({
    onSuccess: () => utils.project.get.invalidate({ id }),
  });
  const deleteMilestone = trpc.project.deleteMilestone.useMutation({
    onSuccess: () => utils.project.get.invalidate({ id }),
  });
  const createTask = trpc.project.createTask.useMutation({
    onSuccess: () => utils.project.get.invalidate({ id }),
  });
  const updateTask = trpc.project.updateTask.useMutation({
    onSuccess: () => utils.project.get.invalidate({ id }),
  });
  const deleteTask = trpc.project.deleteTask.useMutation({
    onSuccess: () => utils.project.get.invalidate({ id }),
  });

  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskMilestoneId, setTaskMilestoneId] = useState<string | null>(null);
  const [addTaskToMilestoneId, setAddTaskToMilestoneId] = useState<string | null>(null);
  const [milestoneTaskTitle, setMilestoneTaskTitle] = useState("");
  const [milestoneTaskDesc, setMilestoneTaskDesc] = useState("");

  if (isLoading || !project) {
    return (
      <div className="max-w-4xl space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const attachedDocIds = new Set(project.documents?.map((d) => d.id) ?? []);
  const availableDocs = documents?.filter((d) => !attachedDocIds.has(d.id)) ?? [];

  return (
    <div className="max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/chat?projectId=${id}`}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Open chat for this project
          </Link>
        </Button>
      </div>

      {/* Definition */}
      <Card>
        <CardHeader>
          <CardTitle>Definition</CardTitle>
          <CardDescription>Name, description, status, and due date.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input
              defaultValue={project.name}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== project.name)
                  updateProject.mutate({ id, name: v });
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea
              defaultValue={project.description ?? ""}
              rows={3}
              onBlur={(e) => {
                const v = e.target.value.trim() || null;
                if (v !== (project.description ?? null))
                  updateProject.mutate({ id, description: v });
              }}
            />
          </div>
          <div className="flex gap-4">
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={project.status ?? "active"}
                onValueChange={(v) => updateProject.mutate({ id, status: v })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Due date</Label>
              <Input
                type="date"
                value={
                  project.dueDate
                    ? new Date(project.dueDate).toISOString().slice(0, 10)
                    : ""
                }
                onChange={(e) => {
                  const v = e.target.value
                    ? new Date(e.target.value)
                    : null;
                  updateProject.mutate({ id, dueDate: v });
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents & Links */}
      <Card>
        <CardHeader>
          <CardTitle>Documents & links</CardTitle>
          <CardDescription>
            Attach existing documents or add external links (e.g. SharePoint).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="mb-2 block">Attached documents</Label>
            <ul className="space-y-1">
              {project.documents?.length
                ? project.documents.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between rounded border px-2 py-1"
                    >
                      <span className="text-sm">{d.filename}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() =>
                          removeDocument.mutate({ projectId: id, documentId: d.id })
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </li>
                  ))
                : "None attached."}
            </ul>
            {availableDocs.length > 0 && (
              <Select
                onValueChange={(docId) => {
                  addDocument.mutate({ projectId: id, documentId: docId });
                }}
              >
                <SelectTrigger className="mt-2 w-full max-w-xs">
                  <SelectValue placeholder="Attach document..." />
                </SelectTrigger>
                <SelectContent>
                  {availableDocs.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.filename}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <Label className="mb-2 block">Links</Label>
            <ul className="space-y-1">
              {project.links?.length
                ? project.links.map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center justify-between rounded border px-2 py-1"
                    >
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {l.label}
                        <ExternalLink className="ml-1 inline h-3 w-3" />
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() =>
                          removeLink.mutate({ projectId: id, linkId: l.id })
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </li>
                  ))
                : "No links."}
            </ul>
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="Label"
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                className="max-w-[140px]"
              />
              <Input
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (linkLabel.trim() && linkUrl.trim()) {
                    addLink.mutate({
                      projectId: id,
                      label: linkLabel.trim(),
                      url: linkUrl.trim(),
                    });
                    setLinkLabel("");
                    setLinkUrl("");
                  }
                }}
              >
                Add link
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
          <CardDescription>Key deliverables or phases; tasks can be linked to a milestone.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-4">
            {project.milestones?.length
              ? project.milestones.map((m) => {
                  const milestoneTasks = (project.tasks ?? []).filter(
                    (t) => t.milestoneId === m.id
                  );
                  return (
                    <li key={m.id} className="rounded border">
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span>{m.title}</span>
                          {m.dueDate && (
                            <span className="text-xs text-muted-foreground">
                              Due: {formatDate(m.dueDate)}
                            </span>
                          )}
                          {m.status && (
                            <Badge variant="secondary">{m.status}</Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteMilestone.mutate({ id: m.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {(addTaskToMilestoneId === m.id || milestoneTasks.length > 0) && (
                        <div className="border-t bg-muted/30 px-3 py-2 space-y-1">
                          {milestoneTasks.length > 0 && (
                        <ul className="space-y-1">
                          {milestoneTasks.map((t) => (
                            <li
                              key={t.id}
                              className="flex items-center justify-between rounded px-2 py-1.5 text-sm"
                            >
                              <div>
                                <span className="font-medium">{t.title}</span>
                                {t.description && (
                                  <p className="text-muted-foreground">
                                    {t.description}
                                  </p>
                                )}
                                <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                                  <Badge variant="secondary">{t.status ?? "todo"}</Badge>
                                  {t.dueDate && (
                                    <span className="text-xs text-muted-foreground">
                                      Due: {formatDate(t.dueDate)}
                                    </span>
                                  )}
                                  {t.conversationId && (
                                    <Link
                                      href={`/chat/${t.conversationId}`}
                                      className="text-xs text-primary hover:underline"
                                    >
                                      View task thread
                                    </Link>
                                  )}
                                  <Select
                                    value={t.milestoneId ?? "none"}
                                    onValueChange={(v) =>
                                      updateTask.mutate({
                                        id: t.id,
                                        milestoneId: v === "none" ? null : v,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-7 w-[140px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">No milestone</SelectItem>
                                      {(project.milestones ?? []).map((mil) => (
                                        <SelectItem key={mil.id} value={mil.id}>
                                          {mil.title}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => deleteTask.mutate({ id: t.id })}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                          )}
                          {addTaskToMilestoneId === m.id ? (
                            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-end flex-wrap">
                              <Input
                                placeholder="Task title"
                                value={milestoneTaskTitle}
                                onChange={(e) => setMilestoneTaskTitle(e.target.value)}
                                className="max-w-xs"
                                autoFocus
                              />
                              <Input
                                placeholder="Description (optional)"
                                value={milestoneTaskDesc}
                                onChange={(e) => setMilestoneTaskDesc(e.target.value)}
                                className="max-w-xs"
                              />
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (milestoneTaskTitle.trim()) {
                                      createTask.mutate({
                                        projectId: id,
                                        milestoneId: m.id,
                                        title: milestoneTaskTitle.trim(),
                                        description: milestoneTaskDesc.trim() || undefined,
                                      });
                                      setMilestoneTaskTitle("");
                                      setMilestoneTaskDesc("");
                                      setAddTaskToMilestoneId(null);
                                    }
                                  }}
                                >
                                  <Plus className="mr-1 h-3 w-3" />
                                  Add
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setAddTaskToMilestoneId(null);
                                    setMilestoneTaskTitle("");
                                    setMilestoneTaskDesc("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-muted-foreground"
                              onClick={() => setAddTaskToMilestoneId(m.id)}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Add task to this milestone
                            </Button>
                          )}
                        </div>
                      )}
                      {milestoneTasks.length === 0 && addTaskToMilestoneId !== m.id && (
                        <div className="border-t bg-muted/30 px-3 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-muted-foreground"
                            onClick={() => setAddTaskToMilestoneId(m.id)}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add task to this milestone
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })
              : "No milestones."}
          </ul>
          <div className="flex gap-2">
            <Input
              placeholder="Milestone title"
              value={milestoneTitle}
              onChange={(e) => setMilestoneTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (milestoneTitle.trim()) {
                    createMilestone.mutate({
                      projectId: id,
                      title: milestoneTitle.trim(),
                    });
                    setMilestoneTitle("");
                  }
                }
              }}
              className="max-w-xs"
            />
            <Button
              size="sm"
              onClick={() => {
                if (milestoneTitle.trim()) {
                  createMilestone.mutate({
                    projectId: id,
                    title: milestoneTitle.trim(),
                  });
                  setMilestoneTitle("");
                }
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tasks (without milestone) + Add task */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>
            Action items; assign to a milestone above or add here and optionally link to a milestone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(() => {
            const tasksWithoutMilestone = (project.tasks ?? []).filter(
              (t) => !t.milestoneId
            );
            return (
              <>
                <ul className="space-y-2">
                  {tasksWithoutMilestone.length
                    ? tasksWithoutMilestone.map((t) => (
                        <li
                          key={t.id}
                          className="flex items-center justify-between rounded border px-3 py-2"
                        >
                          <div>
                            <span className="font-medium">{t.title}</span>
                            {t.description && (
                              <p className="text-sm text-muted-foreground">
                                {t.description}
                              </p>
                            )}
                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary">{t.status ?? "todo"}</Badge>
                              {t.dueDate && (
                                <span className="text-xs text-muted-foreground">
                                  Due: {formatDate(t.dueDate)}
                                </span>
                              )}
                              {t.conversationId && (
                                <Link
                                  href={`/chat/${t.conversationId}`}
                                  className="text-xs text-primary hover:underline"
                                >
                                  View task thread
                                </Link>
                              )}
                              <Select
                                value={t.milestoneId ?? "none"}
                                onValueChange={(v) =>
                                  updateTask.mutate({
                                    id: t.id,
                                    milestoneId: v === "none" ? null : v,
                                  })
                                }
                              >
                                <SelectTrigger className="h-7 w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No milestone</SelectItem>
                                  {(project.milestones ?? []).map((mil) => (
                                    <SelectItem key={mil.id} value={mil.id}>
                                      {mil.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => deleteTask.mutate({ id: t.id })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      ))
                    : "No tasks without a milestone."}
                </ul>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end flex-wrap">
                  <Input
                    placeholder="Task title"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="max-w-xs"
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    className="max-w-xs"
                  />
                  <Select
                    value={taskMilestoneId ?? "none"}
                    onValueChange={(v) =>
                      setTaskMilestoneId(v === "none" ? null : v)
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Milestone (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No milestone</SelectItem>
                      {(project.milestones ?? []).map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (taskTitle.trim()) {
                        createTask.mutate({
                          projectId: id,
                          title: taskTitle.trim(),
                          description: taskDesc.trim() || undefined,
                          milestoneId: taskMilestoneId ?? undefined,
                        });
                        setTaskTitle("");
                        setTaskDesc("");
                        setTaskMilestoneId(null);
                      }
                    }}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add task
                  </Button>
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
