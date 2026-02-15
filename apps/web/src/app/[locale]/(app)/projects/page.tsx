"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function formatDate(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}

export default function ProjectsPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: projectList, isLoading } = trpc.project.list.useQuery();
  const createMut = trpc.project.create.useMutation({
    onSuccess: (data) => {
      utils.project.list.invalidate();
      setOpen(false);
      setNewName("");
      setNewDesc("");
      router.push(`/projects/${data.id}`);
    },
  });
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const t = useTranslations("projects");
  const tCommon = useTranslations("common");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createMut.mutate({
      name: newName.trim(),
      description: newDesc.trim() || undefined,
    });
  };

  return (
    <div className="max-w-3xl space-y-6 p-4 md:p-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t("newProject")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("newProjectTitle")}</DialogTitle>
                <DialogDescription>
                  {t("newProjectDesc")}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="name">{t("name")}</Label>
                  <Input
                    id="name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t("placeholderName")}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="desc">{t("descriptionOptional")}</Label>
                  <Textarea
                    id="desc"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder={t("placeholderDesc")}
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    {tCommon("cancel")}
                  </Button>
                  <Button type="submit" disabled={createMut.isPending}>
                    {createMut.isPending ? t("creating") : tCommon("create")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !projectList?.length ? (
        <p className="text-muted-foreground">
          {t("noProjectsYet")}
        </p>
      ) : (
        <ul className="space-y-2">
          {projectList.map((p) => (
            <li key={p.id}>
              <Link href={`/projects/${p.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-foreground">{p.name}</span>
                      {p.description && (
                        <p className="truncate text-sm text-muted-foreground">
                          {p.description}
                        </p>
                      )}
                      <Badge variant="secondary" className="mt-1">
                        {p.status ?? t("active")}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {t("due")}: {formatDate(p.dueDate)}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
