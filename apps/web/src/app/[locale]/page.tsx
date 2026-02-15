"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;
    if (session) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [session, isPending, router]);

  const t = useTranslations("common");
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">{t("redirecting")}</p>
    </main>
  );
}
