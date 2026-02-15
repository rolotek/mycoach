"use client";

import { useTranslations } from "next-intl";

const MODES = [
  { value: "auto", labelKey: "modeAuto" as const },
  { value: "coaching", labelKey: "modeCoaching" as const },
  { value: "task", labelKey: "modeTask" as const },
] as const;

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: string;
  onChange: (mode: string) => void;
}) {
  const t = useTranslations("chat");
  return (
    <div className="flex gap-1 rounded-lg border border-border p-1">
      {MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === m.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
        >
          {t(m.labelKey)}
        </button>
      ))}
    </div>
  );
}
