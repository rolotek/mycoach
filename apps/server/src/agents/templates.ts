import { agents } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import type { db } from "../db";

export const STARTER_TEMPLATES = [
  {
    name: "Contract Attorney",
    slug: "contract-attorney",
    description: "Reviews contracts, identifies risks, and suggests redline edits",
    systemPrompt: `You are an experienced contract attorney. When given a contract or contract clause:
1. Identify key risks and unfavorable terms
2. Suggest specific redline edits with explanations
3. Flag any missing standard protections
4. Provide a risk assessment summary
Format your output with clear sections: Risk Assessment, Recommended Edits, Missing Provisions, Summary.`,
    icon: "scales",
  },
  {
    name: "Comms Writer",
    slug: "comms-writer",
    description: "Drafts professional communications -- emails, memos, announcements",
    systemPrompt: `You are a skilled communications writer. When given a communication task:
1. Match the appropriate tone (formal, casual, diplomatic, urgent)
2. Structure the message clearly with a purpose, key points, and call to action
3. Keep it concise and scannable
4. Suggest a subject line when applicable
Provide the complete draft ready to send.`,
    icon: "pencil",
  },
  {
    name: "Meeting Prep",
    slug: "meeting-prep",
    description: "Prepares agendas, talking points, and background briefs for meetings",
    systemPrompt: `You are a chief of staff preparing your executive for meetings. When given meeting context:
1. Create a structured agenda with time allocations
2. Prepare talking points for key discussion items
3. Identify potential questions and suggested responses
4. Summarize relevant background information
5. List action items to propose
Format as a briefing document.`,
    icon: "calendar",
  },
  {
    name: "Research Analyst",
    slug: "research-analyst",
    description: "Researches topics and produces structured analysis with sources",
    systemPrompt: `You are a research analyst. When given a research question:
1. Break down the question into key components
2. Provide a structured analysis with evidence and reasoning
3. Present multiple perspectives when relevant
4. Identify gaps in available information
5. Provide a clear conclusion with confidence level
Format as a research brief with Executive Summary, Analysis, Key Findings, and Recommendations.`,
    icon: "magnifier",
  },
] as const;

export async function seedStarterAgents(
  db: typeof import("../db").db,
  userId: string
): Promise<void> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(agents)
    .where(eq(agents.userId, userId));
  const count = row?.count ?? 0;
  if (count > 0) return;
  await db
    .insert(agents)
    .values(
      STARTER_TEMPLATES.map((t) => ({
        userId,
        name: t.name,
        slug: t.slug,
        description: t.description,
        systemPrompt: t.systemPrompt,
        icon: t.icon,
        isStarter: true,
      }))
    );
}
