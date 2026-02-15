"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  MessageSquare,
  Plus,
  Trash2,
  GripVertical,
  Upload,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getLinkIcon } from "@/lib/link-type-utils";
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

const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";

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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addSectionLinkMilestoneId, setAddSectionLinkMilestoneId] = useState<string | null>(null);
  const [sectionLinkLabel, setSectionLinkLabel] = useState("");
  const [sectionLinkUrl, setSectionLinkUrl] = useState("");

  const t = useTranslations("projects");
  const tCommon = useTranslations("common");

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
  const projectLevelDocs = (project.documents ?? []).filter(
    (d: { milestoneId?: string | null }) => !d.milestoneId
  );
  const projectLevelLinks = (project.links ?? []).filter(
    (l: { milestoneId?: string | null }) => !l.milestoneId
  );

  return (
    <div className="max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backToProjects")}
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/chat?projectId=${id}`}>
            <MessageSquare className="mr-2 h-4 w-4" />
            {t("openChatForProject")}
          </Link>
        </Button>
      </div>

      {/* Definition */}
      <Card>
        <CardHeader>
          <CardTitle>{t("definition")}</CardTitle>
          <CardDescription>{t("definitionDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>{t("name")}</Label>
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
            <Label>{t("descriptionLabel")}</Label>
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
              <Label>{t("status")}</Label>
              <Select
                value={project.status ?? "active"}
                onValueChange={(v) => updateProject.mutate({ id, status: v })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("active")}</SelectItem>
                  <SelectItem value="completed">{t("completed")}</SelectItem>
                  <SelectItem value="archived">{t("archived")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("dueDate")}</Label>
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
          <CardTitle>{t("documentsAndLinks")}</CardTitle>
          <CardDescription>{t("documentsAndLinksDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="mb-2 block">{t("attachedDocuments")}</Label>
            <ul className="space-y-1">
              {projectLevelDocs.length
                ? projectLevelDocs.map((d) => (
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
                : t("noneAttached")}
            </ul>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {availableDocs.length > 0 && (
                <Select
                  onValueChange={(docId) => {
                    addDocument.mutate({ projectId: id, documentId: docId });
                  }}
                >
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder={t("attachDocument")} />
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
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="mr-1 h-3 w-3" />
                {uploading ? t("uploading") : t("uploadDocument")}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploading(true);
                    const formData = new FormData();
                    formData.append("file", file);
                    fetch(`${SERVER_URL}/api/documents/upload`, {
                      method: "POST",
                      body: formData,
                      credentials: "include",
                    })
                      .then((res) => {
                        if (!res.ok) throw new Error("Upload failed");
                        return res.json();
                      })
                      .then((doc: { id: string }) => {
                        addDocument.mutate({
                          projectId: id,
                          documentId: doc.id,
                        });
                        utils.project.get.invalidate({ id });
                        utils.document.list.invalidate();
                      })
                      .finally(() => setUploading(false));
                  }
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          <div>
            <Label className="mb-2 block">{t("links")}</Label>
            <ul className="space-y-1">
              {projectLevelLinks.length
                ? projectLevelLinks.map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center justify-between rounded border px-2 py-1"
                    >
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center"
                      >
                        {l.label}
                        {(() => {
                          const LinkIcon = getLinkIcon(
                            (l as { linkType?: string }).linkType ?? "generic"
                          );
                          return (
                            <LinkIcon className="ml-1 h-3 w-3 shrink-0" />
                          );
                        })()}
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
                : t("noLinks")}
            </ul>
            <div className="mt-2 flex gap-2">
              <Input
                placeholder={t("label")}
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                className="max-w-[140px]"
              />
              <Input
                placeholder={t("linkUrlPlaceholder")}
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
                {t("addLink")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle>{t("milestones")}</CardTitle>
          <CardDescription>{t("milestonesDesc")}</CardDescription>
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
                      <div className="border-t bg-muted/20 px-3 py-2 space-y-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/chat?projectId=${id}&milestoneId=${m.id}`}>
                            <MessageSquare className="mr-1 h-3 w-3" />
                            {t("openChatForSection")}
                          </Link>
                        </Button>
                        {(() => {
                          const sectionDocs = (project.documents ?? []).filter(
                            (d: { milestoneId?: string | null }) => d.milestoneId === m.id
                          );
                          const sectionLinksList = (project.links ?? []).filter(
                            (l: { milestoneId?: string | null }) => l.milestoneId === m.id
                          );
                          return (
                            <>
                              <div>
                                <Label className="text-xs text-muted-foreground">{t("sectionDocs")}</Label>
                                {sectionDocs.length > 0 ? (
                                  <ul className="mt-1 space-y-0.5">
                                    {sectionDocs.map((d) => (
                                      <li key={d.id} className="flex items-center justify-between rounded border px-2 py-0.5 text-sm">
                                        <span>{d.filename}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeDocument.mutate({ projectId: id, documentId: d.id })}>
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-muted-foreground mt-0.5">{t("noneAttached")}</p>
                                )}
                                {availableDocs.length > 0 && (
                                  <Select
                                    onValueChange={(docId) => {
                                      addDocument.mutate({ projectId: id, documentId: docId, milestoneId: m.id });
                                    }}
                                  >
                                    <SelectTrigger className="mt-1 h-8 w-full max-w-xs">
                                      <SelectValue placeholder={t("attachDocToSection")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableDocs.map((doc) => (
                                        <SelectItem key={doc.id} value={doc.id}>{doc.filename}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">{t("sectionLinks")}</Label>
                                {sectionLinksList.length > 0 ? (
                                  <ul className="mt-1 space-y-0.5">
                                    {sectionLinksList.map((l) => {
                                      const LinkIcon = getLinkIcon((l as { linkType?: string }).linkType ?? "generic");
                                      return (
                                        <li key={l.id} className="flex items-center justify-between rounded border px-2 py-0.5 text-sm">
                                          <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center">
                                            {l.label}
                                            <LinkIcon className="ml-1 h-3 w-3 shrink-0" />
                                          </a>
                                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeLink.mutate({ projectId: id, linkId: l.id })}>
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-muted-foreground mt-0.5">{t("noLinks")}</p>
                                )}
                                {addSectionLinkMilestoneId === m.id ? (
                                  <div className="mt-1 flex gap-1 flex-wrap">
                                    <Input placeholder={t("label")} value={sectionLinkLabel} onChange={(e) => setSectionLinkLabel(e.target.value)} className="h-8 max-w-[120px]" />
                                    <Input placeholder={t("linkUrlPlaceholder")} value={sectionLinkUrl} onChange={(e) => setSectionLinkUrl(e.target.value)} className="h-8 flex-1 min-w-0" />
                                    <Button size="sm" className="h-8" onClick={() => { if (sectionLinkLabel.trim() && sectionLinkUrl.trim()) { addLink.mutate({ projectId: id, label: sectionLinkLabel.trim(), url: sectionLinkUrl.trim(), milestoneId: m.id }); setSectionLinkLabel(""); setSectionLinkUrl(""); setAddSectionLinkMilestoneId(null); } }}>{t("addLink")}</Button>
                                    <Button variant="ghost" size="sm" className="h-8" onClick={() => { setAddSectionLinkMilestoneId(null); setSectionLinkLabel(""); setSectionLinkUrl(""); }}>{tCommon("cancel")}</Button>
                                  </div>
                                ) : (
                                  <Button variant="ghost" size="sm" className="mt-1 h-8 text-muted-foreground" onClick={() => setAddSectionLinkMilestoneId(m.id)}>{t("addLinkToSection")}</Button>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      {(addTaskToMilestoneId === m.id || milestoneTasks.length > 0) && (
                        <div className="border-t bg-muted/30 px-3 py-2 space-y-1">
                          {milestoneTasks.length > 0 && (
                        <ul className="space-y-1">
                          {milestoneTasks.map((task) => (
                            <li
                              key={task.id}
                              className="flex items-center justify-between rounded px-2 py-1.5 text-sm"
                            >
                              <div>
                                <span className="font-medium">{task.title}</span>
                                {task.description && (
                                  <p className="text-muted-foreground">
                                    {task.description}
                                  </p>
                                )}
                                <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                                  <Badge variant="secondary">{task.status ?? "todo"}</Badge>
                                  {task.dueDate && (
                                    <span className="text-xs text-muted-foreground">
                                      Due: {formatDate(task.dueDate)}
                                    </span>
                                  )}
                                  {task.conversationId && (
                                    <Link
                                      href={`/chat/${task.conversationId}`}
                                      className="text-xs text-primary hover:underline"
                                    >
                                      {t("viewTaskThread")}
                                    </Link>
                                  )}
                                  <Select
                                    value={task.milestoneId ?? "none"}
                                    onValueChange={(v) =>
                                      updateTask.mutate({
                                        id: task.id,
                                        milestoneId: v === "none" ? null : v,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-7 w-[140px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">{t("noMilestone")}</SelectItem>
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
                                onClick={() => deleteTask.mutate({ id: task.id })}
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
                                placeholder={t("taskTitle")}
                                value={milestoneTaskTitle}
                                onChange={(e) => setMilestoneTaskTitle(e.target.value)}
                                className="max-w-xs"
                                autoFocus
                              />
                              <Input
                                placeholder={t("descriptionOptionalPlaceholder")}
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
                                  {t("add")}
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
                                  {tCommon("cancel")}
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
                              {t("addTaskToMilestone")}
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
                            {t("addTaskToMilestone")}
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })
              : t("noMilestones")}
          </ul>
          <div className="flex gap-2">
            <Input
              placeholder={t("milestoneTitle")}
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
              {t("add")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tasks (without milestone) + Add task */}
      <Card>
        <CardHeader>
          <CardTitle>{t("tasks")}</CardTitle>
          <CardDescription>{t("tasksDesc")}</CardDescription>
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
                    ? tasksWithoutMilestone.map((task) => (
                        <li
                          key={task.id}
                          className="flex items-center justify-between rounded border px-3 py-2"
                        >
                          <div>
                            <span className="font-medium">{task.title}</span>
                            {task.description && (
                              <p className="text-sm text-muted-foreground">
                                {task.description}
                              </p>
                            )}
                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary">{task.status ?? "todo"}</Badge>
                              {task.dueDate && (
                                <span className="text-xs text-muted-foreground">
                                  Due: {formatDate(task.dueDate)}
                                </span>
                              )}
                              {task.conversationId && (
                                <Link
                                  href={`/chat/${task.conversationId}`}
                                  className="text-xs text-primary hover:underline"
                                >
                                  {t("viewTaskThread")}
                                </Link>
                              )}
                              <Select
                                value={task.milestoneId ?? "none"}
                                onValueChange={(v) =>
                                  updateTask.mutate({
                                    id: task.id,
                                    milestoneId: v === "none" ? null : v,
                                  })
                                }
                              >
                                <SelectTrigger className="h-7 w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">{t("noMilestone")}</SelectItem>
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
                            onClick={() => deleteTask.mutate({ id: task.id })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      ))
                    : t("noTasksWithoutMilestone")}
                </ul>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end flex-wrap">
                  <Input
                    placeholder={t("taskTitle")}
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="max-w-xs"
                  />
                  <Input
                    placeholder={t("descriptionOptionalPlaceholder")}
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
                      <SelectValue placeholder={t("milestoneOptional")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("noMilestone")}</SelectItem>
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
                    {t("addTask")}
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
