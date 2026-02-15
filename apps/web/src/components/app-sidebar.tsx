"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  Brain,
  FileText,
  FolderKanban,
  Settings,
  LogOut,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleToggle } from "@/components/locale-toggle";
import { Button } from "@/components/ui/button";

const navKeys = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/chat", key: "chat", icon: MessageSquare },
  { href: "/agents", key: "agents", icon: Bot },
  { href: "/memory", key: "memory", icon: Brain },
  { href: "/documents", key: "documents", icon: FileText },
  { href: "/projects", key: "projects", icon: FolderKanban },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const t = useTranslations("sidebar");

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/dashboard" className="font-semibold">
                <span className="text-lg">MyCoach</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("navigation")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navKeys.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const label = t(item.key);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="pb-14">
        <div className="flex items-center gap-1">
          <LocaleToggle />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("signOut")}
            onClick={() => authClient.signOut()}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
