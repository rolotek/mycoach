"use client";

const MODES = [
  { value: "auto", label: "Auto" },
  { value: "coaching", label: "Coaching" },
  { value: "task", label: "Task" },
] as const;

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: string;
  onChange: (mode: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-neutral-200 p-1">
      {MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === m.value
              ? "bg-blue-600 text-white"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
