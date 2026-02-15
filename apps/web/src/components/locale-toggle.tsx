"use client";

import { useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LOCALE_OPTIONS: { value: string | "system"; label: string }[] = [
  { value: "system", label: "System" },
  { value: "en", label: "English" },
  { value: "fr-FR", label: "Français" },
  { value: "it", label: "Italiano" },
  { value: "ja", label: "日本語" },
  { value: "zh-CN", label: "简体中文" },
  { value: "en-GB", label: "British English" },
];

const COOKIE_NAME = "NEXT_LOCALE";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

function setLocaleCookie(locale: string) {
  document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function clearLocaleCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}

export function LocaleToggle() {
  const locale = useLocale();
  const pathname = usePathname();

  function handleSelect(value: string | "system") {
    const base = pathname?.startsWith("/") ? pathname : `/${pathname ?? ""}`;
    if (value === "system") {
      clearLocaleCookie();
      window.location.href = `/${routing.defaultLocale}${base || ""}`;
      return;
    }
    setLocaleCookie(value);
    window.location.href = `/${value}${base}`;
  }

  const currentLabel =
    LOCALE_OPTIONS.find((o) => o.value === locale)?.label ?? "System";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Language: ${currentLabel}`}>
          <Languages className="h-[1.2rem] w-[1.2rem]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALE_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
          >
            {opt.label}
            {opt.value === locale && (
              <span className="ml-2 text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
