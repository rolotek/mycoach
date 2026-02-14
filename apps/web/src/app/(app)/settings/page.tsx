"use client";

import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useState, useEffect } from "react";

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
      <div className="min-h-screen bg-neutral-50 p-8">
        <div className="mx-auto max-w-2xl">Loading settings…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-neutral-900">Settings</h1>
        <p className="mt-1 text-neutral-600">Choose your preferred LLM provider and model.</p>

        <div className="mt-8 space-y-6 rounded-lg border border-neutral-200 bg-white p-6">
          <div>
            <label htmlFor="provider" className="block text-sm font-medium text-neutral-700 mb-1">
              Provider
            </label>
            <select
              id="provider"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-neutral-700 mb-1">
              Model
            </label>
            <select
              id="model"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saveStatus === "saving" ? "Saving…" : "Save"}
            </button>
            {saveStatus === "saved" && (
              <span className="text-sm text-green-600">Saved.</span>
            )}
            {saveStatus === "error" && saveError && (
              <span className="text-sm text-red-600" role="alert">
                {saveError}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
