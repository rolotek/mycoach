"use client";

import { authClient } from "@/lib/auth-client";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { MessageSquare, Brain, FileText, Bot, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { data: session } = authClient.useSession();
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  if (!session) return null;

  const cards = [
    { href: "/chat", icon: MessageSquare, titleKey: "startCoachingSession" as const, descKey: "startCoachingDesc" as const, primary: true },
    { href: "/memory", icon: Brain, titleKey: "memoryTitle" as const, descKey: "memoryDesc" as const, primary: false },
    { href: "/documents", icon: FileText, titleKey: "documentsTitle" as const, descKey: "documentsDesc" as const, primary: false },
    { href: "/agents", icon: Bot, titleKey: "agentsTitle" as const, descKey: "agentsDesc" as const, primary: false },
    { href: "/settings", icon: Settings, titleKey: "settingsTitle" as const, descKey: "settingsDesc" as const, primary: false },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title={t("welcome", { name: session.user?.name ?? t("user") })}
        description={session.user?.email ?? ""}
        actions={
          <Button variant="ghost" onClick={handleSignOut}>
            {t("signOut")}
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ href, icon: Icon, titleKey, descKey, primary }) => (
          <Link key={href} href={href}>
            <Card className="group cursor-pointer transition-colors hover:bg-accent">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <CardTitle className={primary ? "text-primary" : undefined}>{t(titleKey)}</CardTitle>
                </div>
                <CardDescription>{t(descKey)}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
