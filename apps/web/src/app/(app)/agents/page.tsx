"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function AgentsPage() {
  const utils = trpc.useUtils();
  const { data: agents, isLoading } = trpc.agent.list.useQuery();
  const createMut = trpc.agent.create.useMutation({
    onSuccess: () => utils.agent.list.invalidate(),
  });
  const updateMut = trpc.agent.update.useMutation({
    onSuccess: () => {
      utils.agent.list.invalidate();
      setEditingId(null);
    },
  });
  const deleteMut = trpc.agent.delete.useMutation({
    onSuccess: () => utils.agent.list.invalidate(),
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
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Agents</h1>
            <p className="mt-1 text-neutral-600">
              Your specialist agent library
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create Agent
          </button>
        </div>

        {(showForm || editingId) && (
          <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-medium text-neutral-900">
              {editingId ? "Edit Agent" : "New Agent"}
            </h2>
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700">
                  Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  maxLength={100}
                  className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
                  placeholder="e.g. Contract Attorney"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  maxLength={500}
                  rows={2}
                  className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
                  placeholder="What this agent does"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">
                  System prompt
                </label>
                <textarea
                  value={formSystemPrompt}
                  onChange={(e) => setFormSystemPrompt(e.target.value)}
                  rows={6}
                  className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
                  placeholder="Instructions for the agent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">
                  Icon (optional)
                </label>
                <input
                  type="text"
                  value={formIcon}
                  onChange={(e) => setFormIcon(e.target.value)}
                  className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
                  placeholder="e.g. 📄 or scales"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={
                    !formName.trim() ||
                    !formDescription.trim() ||
                    !formSystemPrompt.trim() ||
                    createMut.isPending ||
                    updateMut.isPending
                  }
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="mt-6 text-neutral-500">Loading...</p>
        ) : !agents?.length ? (
          <p className="mt-6 text-neutral-500">
            No agents yet. Create one or your starter templates will appear when
            you open this page.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {agents.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {a.icon && (
                        <span className="text-lg" aria-hidden>
                          {a.icon}
                        </span>
                      )}
                      <span className="font-semibold text-neutral-900">
                        {a.name}
                      </span>
                      {a.isStarter && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                          Starter
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-600">
                      {a.description}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(a)}
                    className="rounded border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    className="rounded border border-neutral-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
