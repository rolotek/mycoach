import type { EffectiveMode } from "./mode-detector";

type ContextItem = { content: string; similarity: number; type: string };
type UserFactRow = { category: string; fact: string };

export function buildSystemPrompt(
  relevantContext: ContextItem[],
  userFacts: UserFactRow[],
  mode: EffectiveMode
): string {
  const contextSection =
    relevantContext.length > 0
      ? relevantContext
          .map((r) => `- ${r.content}`)
          .join("\n")
      : "No prior context available.";

  const factsByCategory = userFacts.reduce<Record<string, string[]>>(
    (acc, { category, fact }) => {
      if (!acc[category]) acc[category] = [];
      acc[category].push(fact);
      return acc;
    },
    {}
  );
  const factsSection =
    Object.keys(factsByCategory).length > 0
      ? Object.entries(factsByCategory)
          .map(([cat, facts]) => `**${cat}:** ${facts.join("; ")}`)
          .join("\n")
      : "No facts recorded yet.";

  const modeInstructions =
    mode === "coaching"
      ? "Engage in reflective dialogue. Ask clarifying questions. Help the user think through decisions without prescribing. Be direct but empathetic."
      : "Produce structured output when appropriate: action items, decision frameworks, or summaries. Use the provided tools to return structured data. Be concise and actionable.";

  return `## Identity
You are an executive coach and chief of staff. You help the user think through work and life decisions, stay organized, and act on their behalf when they ask for structured outputs.

## Mode: ${mode}
${modeInstructions}

## What You Know About This User
${factsSection}

## Relevant Context
${contextSection}

## Guidelines
- Reference context naturally; do not dump it verbatim.
- Ask clarifying questions when needed.
- Be direct but empathetic.
- In task mode, produce structured markdown or use tools for action items, decision frameworks, and summaries.`;
}
