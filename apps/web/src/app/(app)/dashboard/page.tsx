"use client";

import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Welcome, {session.user?.name ?? "User"}
        </h1>
        <p className="mt-1 text-neutral-600">{session.user?.email}</p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link
            href="/chat"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Start Coaching Session
          </Link>
          <Link
            href="/memory"
            className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Memory & Knowledge
          </Link>
          <Link
            href="/documents"
            className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Documents
          </Link>
          <Link
            href="/agents"
            className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Agents
          </Link>
          <Link
            href="/settings"
            className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Settings
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
