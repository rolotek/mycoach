"use client";

import {
  Calendar,
  Pencil,
  Scale,
  Search,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  scales: Scale,
  pencil: Pencil,
  calendar: Calendar,
  magnifier: Search,
};

const DEFAULT_SIZE = "h-5 w-5";

export function AgentIcon({
  icon,
  className,
  size = DEFAULT_SIZE,
}: {
  icon: string | null | undefined;
  className?: string;
  size?: string;
}) {
  if (!icon) return null;

  const normalized = icon.trim().toLowerCase();
  const LucideIcon = ICON_MAP[normalized];

  if (LucideIcon) {
    return <LucideIcon className={size} aria-hidden />;
  }

  // Emoji or custom text (e.g. "📄")
  return (
    <span className={`text-lg ${className ?? ""}`} aria-hidden>
      {icon}
    </span>
  );
}
