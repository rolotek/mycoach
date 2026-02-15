"use client";

import { useTranslations } from "next-intl";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { CheckCircle2, Loader2 } from "lucide-react";

const PROVIDER_PLACEHOLDERS: Record<string, string> = {
  anthropic: "sk-ant-...",
  openai: "sk-...",
  google: "AIza...",
};

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const utils = trpc.useUtils();
  const { data: settings, isLoading: settingsLoading } = trpc.settings.get.useQuery();
  const { data: providers = [] } = trpc.llm.listProviders.useQuery();
  const { data: apiKeys = [], isLoading: apiKeysLoading } = trpc.apiKey.list.useQuery();
  const { data: usageSummary, isLoading: usageLoading } = trpc.usage.summary.useQuery();

  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 2000);
      utils.settings.get.invalidate();
    },
    onError: (err) => {
      setSaveStatus("error");
      setSaveError(err.message);
    },
  });
  const saveKeyMutation = trpc.apiKey.save.useMutation({
    onSuccess: (_, variables) => {
      utils.apiKey.list.invalidate();
      setKeyStatus((s) => ({
        ...s,
        [variables.provider]: { saving: false, success: true, error: null },
      }));
      setTimeout(
        () =>
          setKeyStatus((s) => ({
            ...s,
            [variables.provider]: { ...s[variables.provider], success: false },
          })),
        2000
      );
    },
    onError: (err, variables) => {
      setKeyStatus((s) => ({
        ...s,
        [variables.provider]: { saving: false, success: false, error: err.message },
      }));
    },
  });
  const deleteKeyMutation = trpc.apiKey.delete.useMutation({
    onSuccess: () => utils.apiKey.list.invalidate(),
  });

  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [monthlyBudgetDollars, setMonthlyBudgetDollars] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "error" | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [keyStatus, setKeyStatus] = useState<Record<string, { saving: boolean; success: boolean; error: string | null }>>({});

  useEffect(() => {
    if (settings) {
      setSelectedProvider(settings.preferredProvider ?? "anthropic");
      setSelectedModel(settings.preferredModel ?? "anthropic:claude-sonnet-4-20250514");
      setMonthlyBudgetDollars(
        settings.monthlyBudgetCents != null ? String(settings.monthlyBudgetCents / 100) : ""
      );
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
    const budgetCents =
      monthlyBudgetDollars === "" ? undefined : Math.round(parseFloat(monthlyBudgetDollars) * 100);
    updateMutation.mutate({
      preferredProvider: selectedProvider,
      preferredModel: selectedModel,
      monthlyBudgetCents: budgetCents ?? null,
    });
  }

  function handleSaveKey(provider: "anthropic" | "openai" | "google") {
    const key = keyInputs[provider]?.trim();
    if (!key || key.length < 10) return;
    setKeyStatus((s) => ({ ...s, [provider]: { saving: true, success: false, error: null } }));
    saveKeyMutation.mutate({ provider, apiKey: key });
  }

  function handleDeleteKey(provider: "anthropic" | "openai" | "google") {
    const key =
      provider === "anthropic"
        ? "removeKeyConfirmAnthropic"
        : provider === "openai"
          ? "removeKeyConfirmOpenai"
          : "removeKeyConfirmGoogle";
    if (confirm(t(key))) {
      deleteKeyMutation.mutate({ provider });
    }
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
        title={t("title")}
        description={t("description")}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("apiKeys")}</CardTitle>
          <CardDescription>{t("apiKeysDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {providers.map((p) => {
            const id = p.id;
            const keyRow = apiKeys.find((k) => k.provider === id);
            const status = keyStatus[id] ?? { saving: false, success: false, error: null };
            return (
              <div key={id} className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
                <div className="flex-1 space-y-2">
                  <Label>{p.name}</Label>
                  {keyRow ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-muted-foreground">
                        {keyRow.maskedKey}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteKey(id as "anthropic" | "openai" | "google")}
                        disabled={deleteKeyMutation.isPending}
                      >
                        {tCommon("delete")}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder={PROVIDER_PLACEHOLDERS[id] ?? "..."}
                        value={keyInputs[id] ?? ""}
                        onChange={(e) =>
                          setKeyInputs((prev) => ({ ...prev, [id]: e.target.value }))
                        }
                        className="font-mono"
                      />
                      <Button
                        onClick={() => handleSaveKey(id as "anthropic" | "openai" | "google")}
                        disabled={status.saving || !(keyInputs[id]?.trim().length >= 10)}
                      >
                        {status.saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          t("saveVerify")
                        )}
                      </Button>
                    </div>
                  )}
                </div>
                {status.success && (
                  <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-500">
                    <CheckCircle2 className="h-4 w-4" /> {t("verified")}
                  </span>
                )}
                {status.error && (
                  <span className="text-sm text-destructive" role="alert">
                    {status.error}
                  </span>
                )}
              </div>
            );
          })}
          {apiKeysLoading && <Skeleton className="h-10 w-full" />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("llmConfig")}</CardTitle>
          <CardDescription>{t("llmConfigDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="provider">{t("provider")}</Label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger id="provider" className="w-full">
                <SelectValue placeholder={t("selectProvider")} />
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
            <Label htmlFor="model">{t("model")}</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger id="model" className="w-full">
                <SelectValue placeholder={t("selectModel")} />
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
          <div className="space-y-2">
            <Label htmlFor="budget">{t("budget")}</Label>
            <Input
              id="budget"
              type="number"
              min={0}
              step={1}
              placeholder={t("noLimit")}
              value={monthlyBudgetDollars}
              onChange={(e) => setMonthlyBudgetDollars(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t("budgetHelp")}</p>
          </div>
        </CardContent>
        <CardFooter className="flex items-center gap-4">
          <Button onClick={handleSave} disabled={saveStatus === "saving"}>
            {saveStatus === "saving" ? t("saving") : tCommon("save")}
          </Button>
          {saveStatus === "saved" && (
            <span className="text-sm text-muted-foreground">{t("saved")}</span>
          )}
          {saveStatus === "error" && saveError && (
            <span className="text-sm text-destructive" role="alert">
              {saveError}
            </span>
          )}
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("usageThisMonth")}</CardTitle>
          <CardDescription>{t("usageDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {usageLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : usageSummary ? (
            <>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-2xl font-semibold">
                  ${(usageSummary.totalCostCents / 10000).toFixed(2)}
                </span>
                {usageSummary.monthlyBudgetCents != null && (
                  <span className="text-sm text-muted-foreground">
                    Budget: ${(usageSummary.monthlyBudgetCents / 100).toFixed(2)}
                  </span>
                )}
              </div>
              {usageSummary.byProvider && usageSummary.byProvider.length > 0 ? (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {usageSummary.byProvider.map(({ provider, totalCostCents }) => (
                    <span key={provider}>
                      {providers.find((x) => x.id === provider)?.name ?? provider}: $
                      {(totalCostCents / 10000).toFixed(2)}
                    </span>
                  ))}
                </div>
              ) : null}
              {usageSummary.monthlyBudgetCents != null && usageSummary.monthlyBudgetCents > 0 && (
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (usageSummary.totalCostCents / 10000 / (usageSummary.monthlyBudgetCents / 100)) * 100
                      )}%`,
                    }}
                  />
                </div>
              )}
              {usageSummary.breakdown.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 pr-4">{t("modelCol")}</th>
                        <th className="py-2 pr-4">{t("requestsCol")}</th>
                        <th className="py-2 pr-4">{t("inputCol")}</th>
                        <th className="py-2 pr-4">{t("outputCol")}</th>
                        <th className="py-2">{t("estCost")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageSummary.breakdown.map((row) => (
                        <tr key={`${row.provider}-${row.model}`} className="border-b">
                          <td className="py-2 pr-4">
                            {row.provider} / {row.model}
                          </td>
                          <td className="py-2 pr-4">{row.requestCount}</td>
                          <td className="py-2 pr-4">{row.totalInput.toLocaleString()}</td>
                          <td className="py-2 pr-4">{row.totalOutput.toLocaleString()}</td>
                          <td className="py-2">
                            ${(row.totalCost / 10000).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("noUsageYet")}</p>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
