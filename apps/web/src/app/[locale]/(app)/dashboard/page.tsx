"use client";

import { authClient } from "@/lib/auth-client";
import { Link, useRouter } from "@/i18n/navigation";
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
  const { data: session } = authClient.useSession();
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  if (!session) return null;

  const cards = [
    { href: "/chat", icon: MessageSquare, title: "Start Coaching Session", description: "Begin a new conversation", primary: true },
    { href: "/memory", icon: Brain, title: "Memory & Knowledge", description: "View and manage your facts" },
    { href: "/documents", icon: FileText, title: "Documents", description: "Upload and manage documents" },
    { href: "/agents", icon: Bot, title: "Agents", description: "Manage specialist agents" },
    { href: "/settings", icon: Settings, title: "Settings", description: "LLM provider and preferences" },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title={`Welcome, ${session.user?.name ?? "User"}`}
        description={session.user?.email ?? ""}
        actions={
          <Button variant="ghost" onClick={handleSignOut}>
            Sign out
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ href, icon: Icon, title, description, primary }) => (
          <Link key={href} href={href}>
            <Card className="group cursor-pointer transition-colors hover:bg-accent">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <CardTitle className={primary ? "text-primary" : undefined}>{title}</CardTitle>
                </div>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
