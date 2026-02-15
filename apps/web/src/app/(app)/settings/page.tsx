"use client";

import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";

export default function SettingsPage() {
  const { data: settings, isLoading: settingsLoading } = trpc.settings.get.useQuery();
  const { data: providers = [] } = trpc.llm.listProviders.useQuery();
  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 2000);
    },
    onError: (err) => {
      setSaveStatus("error");
      setSaveError(err.message);
    },
  });

  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "error" | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setSelectedProvider(settings.preferredProvider ?? "anthropic");
      setSelectedModel(settings.preferredModel ?? "anthropic:claude-sonnet-4-20250514");
    }
  }, [settings]);

  const currentProvider = providers.find((p) => p.id === selectedProvider);
  const models = currentProvider?.models ?? [];

  useEffect(() => {
    if (selectedProvider && models.length > 0 && !models.some((m) => m.id === selectedModel)) {
      setSelectedModel(models[0].id);
    }
  }, [selectedProvider, models, selectedModel]);

  function handleSave() {
    setSaveError(null);
    setSaveStatus("saving");
    updateMutation.mutate({
      preferredProvider: selectedProvider,
      preferredModel: selectedModel,
    });
  }

  if (settingsLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="Settings"
        description="Choose your preferred LLM provider and model."
      />
      <Card>
        <CardHeader>
          <CardTitle>LLM Configuration</CardTitle>
          <CardDescription>Select provider and model for coaching and agents.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger id="provider" className="w-full">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger id="model" className="w-full">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="flex items-center gap-4">
          <Button onClick={handleSave} disabled={saveStatus === "saving"}>
            {saveStatus === "saving" ? "Saving…" : "Save"}
          </Button>
          {saveStatus === "saved" && (
            <span className="text-sm text-muted-foreground">Saved.</span>
          )}
          {saveStatus === "error" && saveError && (
            <span className="text-sm text-destructive" role="alert">
              {saveError}
            </span>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
