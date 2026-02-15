# Phase 4: Agent Evolution - Research

**Researched:** 2026-02-14
**Domain:** User feedback collection, LLM-driven prompt evolution, agent versioning and lifecycle management
**Confidence:** HIGH

## Summary

Phase 4 adds three capabilities to the existing agent system built in Phase 3: (1) feedback collection on agent outputs, (2) LLM-driven prompt evolution based on accumulated feedback, and (3) agent versioning with lifecycle management (edit, version history, archive). No new libraries are needed -- all three requirements are achievable with the existing stack (AI SDK 6, Drizzle, tRPC, React).

The core technical challenge is EVOL-02: making agent prompts evolve based on user feedback. The recommended approach is a **meta-prompting pipeline** -- when enough feedback accumulates for an agent (threshold: 3+ feedback items), a background `generateText` call synthesizes the feedback into a revised system prompt. This follows the same pattern as the existing `extractFacts` background job: fire-and-forget after a chat interaction. The revised prompt is stored as a new version in an `agentVersions` table, and the agent's `systemPrompt` column is updated in-place. Users can view version history and revert if a revision goes wrong.

Feedback collection (EVOL-01) requires a new `agentFeedback` table and a tRPC mutation. The UI attaches thumbs up/down buttons plus an optional text correction to the `AgentResultCard` component from Phase 3. Agent lifecycle management (EVOL-03) extends the Phase 3 agents page with version history viewing, soft-delete archiving (via an `archivedAt` timestamp), and the ability to revert to previous prompt versions.

**Primary recommendation:** Build a `agentFeedback` table for feedback storage, a `agentVersions` table for prompt version history, and a background meta-prompting pipeline using `generateText` to synthesize feedback into improved system prompts. No new dependencies needed.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ai | 6.0.86 | generateText for meta-prompting pipeline, Output.object for structured revision output | Already installed; fact-extractor uses identical pattern |
| drizzle-orm | 0.41.0 | agentFeedback and agentVersions tables, soft-delete queries | Already installed |
| zod | 3.23.8 | Feedback input validation, prompt revision schema | Already installed |
| @trpc/server | 11.10.0 | Feedback and version management procedures | Already installed |
| @ai-sdk/react | 3.0.88 | Feedback UI within chat messages | Already installed |
| hono | 4.6.14 | No new routes needed (all via tRPC) | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | - | - | All dependencies already in the project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| LLM meta-prompting for prompt evolution | DSPy / PromptWizard framework | Meta-prompting via generateText is simpler, uses existing infra, no Python dependency; DSPy/PromptWizard are heavier and designed for batch optimization, not per-user evolution |
| Simple version counter in agents table | Separate agentVersions table | Separate table gives full history with diffs; counter-only approach loses history |
| Soft-delete via archivedAt column | Physical delete + separate archive table | archivedAt is simpler, keeps data in one table, easy to unarchive; separate table adds migration complexity |
| Background prompt evolution (fire-and-forget) | Synchronous prompt evolution on feedback submit | Background avoids blocking the user; synchronous would add 5-10s latency to feedback submission |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
apps/server/src/
  agents/
    templates.ts           # (existing from Phase 3) starter templates
    chief-of-staff.ts      # (existing from Phase 3) ToolLoopAgent factory
    agent-executor.ts      # (existing from Phase 3) specialist execution
    agent-tools.ts         # (existing from Phase 3) dynamic tool builder
    prompt-evolver.ts      # NEW: meta-prompting pipeline for EVOL-02
  db/
    schema.ts              # ADD: agentFeedback, agentVersions tables
  trpc/
    router.ts              # ADD: feedbackRouter, agentVersion procedures
apps/web/src/
  app/(app)/agents/
    page.tsx               # EXTEND: add version history, archive toggle
    [id]/
      page.tsx             # NEW: agent detail page with version history
  app/(app)/chat/
    components/
      agent-result.tsx     # EXTEND: add feedback buttons (thumbs up/down + correction)
```

### Pattern 1: Feedback Collection on Agent Results
**What:** After an agent execution completes and the result card renders in chat, the user can provide thumbs up/down and optionally type a correction or preference note. This is stored in the `agentFeedback` table linked to the execution.
**When to use:** Every agent result card in the chat interface.
**Example:**
```typescript
// In AgentResultCard component, add feedback buttons
// tRPC mutation for submitting feedback
const feedbackMut = trpc.agentFeedback.create.useMutation();

// After showing the agent result:
<div className="mt-2 flex items-center gap-2 border-t pt-2">
  <button
    onClick={() => feedbackMut.mutate({
      executionId: execution.id,
      agentId: agent.id,
      rating: "positive",
    })}
    className={thumbsUpClasses}
    aria-label="Good result"
  >
    +
  </button>
  <button
    onClick={() => feedbackMut.mutate({
      executionId: execution.id,
      agentId: agent.id,
      rating: "negative",
    })}
    className={thumbsDownClasses}
    aria-label="Poor result"
  >
    -
  </button>
  <button onClick={() => setShowCorrectionInput(true)}>
    Add correction
  </button>
</div>
```

### Pattern 2: Meta-Prompting Pipeline for Prompt Evolution
**What:** A background function that takes accumulated feedback for an agent and uses an LLM to synthesize a revised system prompt. Follows the exact same pattern as `fact-extractor.ts` -- uses `generateText` with `Output.object` to produce a structured result.
**When to use:** Triggered after each new feedback submission, but only runs the LLM call when feedback count since last evolution exceeds a threshold (3+ new items).
**Example:**
```typescript
// apps/server/src/agents/prompt-evolver.ts
import { generateText, Output } from "ai";
import { z } from "zod";

const revisionSchema = z.object({
  revisedPrompt: z.string(),
  changesSummary: z.string(),
  reasoning: z.string(),
});

const META_PROMPT = `You are a prompt engineer. Given an agent's current system prompt and user feedback on its outputs, produce an improved version of the system prompt.

Rules:
- Preserve the agent's core identity and purpose
- Incorporate positive feedback patterns (reinforce what works)
- Address negative feedback patterns (fix what doesn't work)
- Apply specific corrections the user has provided
- Keep the prompt concise and actionable
- Do NOT add capabilities the original prompt didn't have
- Do NOT remove core instructions unless feedback specifically contradicts them

Return a JSON object with:
- revisedPrompt: the full improved system prompt
- changesSummary: 1-2 sentence summary of what changed
- reasoning: why these changes address the feedback`;

export async function evolveAgentPrompt(
  agentId: string,
  currentPrompt: string,
  feedback: Array<{ rating: string; correction: string | null; task: string; result: string }>,
  modelId: string
): Promise<{ revisedPrompt: string; changesSummary: string } | null> {
  if (feedback.length < 3) return null; // threshold not met

  const feedbackText = feedback.map((f, i) =>
    `Feedback ${i + 1}:
Rating: ${f.rating}
Task: ${f.task}
Agent Output (excerpt): ${f.result.slice(0, 500)}
${f.correction ? `User Correction: ${f.correction}` : "(no correction provided)"}`
  ).join("\n\n");

  const result = await generateText({
    model: getModel(modelId),
    system: META_PROMPT,
    prompt: `Current System Prompt:\n${currentPrompt}\n\nAccumulated User Feedback:\n${feedbackText}`,
    output: Output.object({ schema: revisionSchema }),
  });

  return result.output;
}
```

### Pattern 3: Agent Versioning via agentVersions Table
**What:** Every time a prompt changes (manual edit or automatic evolution), the previous version is saved to `agentVersions`. This creates a full audit trail and enables rollback.
**When to use:** On every agent update (tRPC agent.update) and every successful prompt evolution.
**Example:**
```typescript
// Before updating the agent's systemPrompt, save current version:
async function saveAgentVersion(db: DB, agentId: string, currentAgent: AgentRow) {
  const [lastVersion] = await db
    .select({ version: agentVersions.version })
    .from(agentVersions)
    .where(eq(agentVersions.agentId, agentId))
    .orderBy(desc(agentVersions.version))
    .limit(1);

  const nextVersion = (lastVersion?.version ?? 0) + 1;

  await db.insert(agentVersions).values({
    agentId,
    version: nextVersion,
    systemPrompt: currentAgent.systemPrompt,
    changeSource: "manual", // or "evolution"
    changeSummary: null, // filled by evolver for auto-changes
  });
}
```

### Pattern 4: Soft-Delete Archive via archivedAt
**What:** Agents are not physically deleted when archived. An `archivedAt` timestamp column is added. Archived agents are excluded from the chief-of-staff's tool list but remain viewable in the agents management page.
**When to use:** When user wants to retire an agent without losing its history.
**Example:**
```typescript
// In agents query for chief-of-staff (active agents only):
const activeAgents = await db.select().from(agents)
  .where(and(eq(agents.userId, user.id), isNull(agents.archivedAt)));

// In agents management page (show all, with archive status):
const allAgents = await db.select().from(agents)
  .where(eq(agents.userId, user.id))
  .orderBy(agents.archivedAt, agents.name); // archived last
```

### Anti-Patterns to Avoid
- **Evolving prompts on every single feedback:** Running the meta-prompting LLM call on every thumbs-up/down is wasteful and creates noise. Use a threshold (3+ feedback items since last evolution) and batch process.
- **Auto-evolving without user visibility:** Users must be able to see what changed and revert. Never silently replace a prompt. Show a notification or changelog entry.
- **Storing only the latest prompt version:** Without version history, users cannot revert a bad evolution. The agentVersions table is essential.
- **Using the same model for evolution as for execution:** The meta-prompting pipeline should ideally use a strong model (Claude Sonnet 4, GPT-4o) even if the agent executes on a local model. Use `COACH_FACT_MODEL` or a dedicated `PROMPT_EVOLUTION_MODEL` env var.
- **Blocking the feedback submission on LLM call:** The evolution pipeline must be async/fire-and-forget. The user clicks thumbs-down, the feedback is stored instantly, and the evolution check runs in the background.
- **Physical deletion of agents:** Always soft-delete (archive). Agent history, feedback, and versions are valuable data that should never be lost.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Prompt diff visualization | Custom diff algorithm | Simple before/after display or a diff library like `diff` npm package (if needed) | Text diffing has edge cases with whitespace, line breaks; but for v1, a simple before/after display suffices |
| Structured output from meta-prompting | Manual JSON parsing of LLM output | AI SDK `Output.object({ schema })` with zod | Already used in fact-extractor; handles parsing, validation, retries |
| Feedback aggregation scoring | Custom ML model for feedback analysis | LLM-as-a-judge via generateText | The LLM can understand nuanced text corrections better than any rule-based system |
| Version numbering | Custom sequence generator | Auto-increment integer from MAX(version) + 1 query | Simple, deterministic, no gaps needed |

**Key insight:** The meta-prompting pipeline is the core innovation here, and it is deliberately simple -- one `generateText` call with accumulated feedback. The complexity is in the data model (feedback storage, version history, archive status) and the UX (showing evolution history, enabling revert), not in the LLM call itself.

## Common Pitfalls

### Pitfall 1: Prompt Drift
**What goes wrong:** After many evolution cycles, the agent's prompt drifts far from its original purpose. A contract attorney agent starts adding meeting prep instructions because one feedback mentioned a meeting.
**Why it happens:** Each evolution only sees recent feedback and the current prompt, not the original intent.
**How to avoid:** Store the original prompt (version 0) in agentVersions and always include it in the meta-prompting context: "Original purpose: {originalPrompt}". The meta-prompt instruction "Do NOT add capabilities the original prompt didn't have" helps constrain drift.
**Warning signs:** Agent outputs become unfocused or cover too many topics; user starts getting unexpected results.

### Pitfall 2: Feedback Without Context
**What goes wrong:** A thumbs-down without a correction gives the evolver no actionable signal. If most feedback is just thumbs-down with no text, the LLM has to guess what was wrong.
**Why it happens:** Users take the path of least resistance.
**How to avoid:** Make the correction text input prominent on negative feedback. Consider requiring at least a brief note for thumbs-down ("What should have been different?"). For thumbs-up, no text is fine.
**Warning signs:** High ratio of negative feedback with empty corrections.

### Pitfall 3: Evolution Triggering Too Aggressively
**What goes wrong:** The system evolves the prompt after every 3 pieces of feedback, even if 2 are positive and 1 is negative. The positive signal is ignored.
**Why it happens:** Simple count threshold without considering feedback sentiment distribution.
**How to avoid:** Only trigger evolution when there are 3+ pieces of feedback AND at least 1 negative or correction-bearing feedback item. Pure positive feedback should reinforce existing behavior, not trigger unnecessary changes.
**Warning signs:** Agent prompts changing when users are happy with outputs.

### Pitfall 4: Lost Execution Context in Feedback
**What goes wrong:** Feedback is stored but cannot be correlated back to the specific task and result. The meta-prompting LLM needs to see what was asked, what was produced, and what the user thought -- not just the rating.
**Why it happens:** Feedback table only stores agentId + rating, not the execution details.
**How to avoid:** Link feedback to `agentExecutions` via executionId. The execution record already has `task` and `result` columns. The meta-prompting pipeline joins feedback with execution data.
**Warning signs:** Evolution produces vague improvements because it lacks concrete examples.

### Pitfall 5: Archived Agents Still Appearing in Chat
**What goes wrong:** After archiving an agent, it still appears as a dispatch option in the chief-of-staff's tool list.
**Why it happens:** The chief-of-staff query for building tools doesn't filter out archived agents.
**How to avoid:** Add `isNull(agents.archivedAt)` to the agent query in the chat route when building dynamic tools. Verify with a test after archiving.
**Warning signs:** User sees dispatch suggestions for agents they thought they retired.

### Pitfall 6: Version History Grows Without Bounds
**What goes wrong:** After many manual edits and automatic evolutions, an agent might have 50+ versions.
**Why it happens:** No pruning or pagination of version history.
**How to avoid:** Paginate version history in the UI (show last 10 by default). Optionally cap at 20-50 versions per agent with oldest pruning (but keep version 0, the original). For v1, just paginate -- pruning can wait.
**Warning signs:** Slow queries on agents with many versions.

## Code Examples

Verified patterns from official sources and existing codebase:

### Database Schema: agentFeedback Table
```typescript
// Consistent with existing schema.ts patterns
export const agentFeedback = pgTable(
  "agent_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    executionId: uuid("execution_id")
      .references(() => agentExecutions.id, { onDelete: "set null" }),
    rating: text("rating").notNull(), // "positive" | "negative"
    correction: text("correction"), // optional text feedback
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("agent_feedback_agentId_idx").on(table.agentId),
    index("agent_feedback_userId_idx").on(table.userId),
  ]
);
```

### Database Schema: agentVersions Table
```typescript
export const agentVersions = pgTable(
  "agent_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    systemPrompt: text("system_prompt").notNull(),
    changeSource: text("change_source").notNull(), // "manual" | "evolution" | "initial"
    changeSummary: text("change_summary"), // null for manual, LLM-generated for evolution
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("agent_versions_agentId_idx").on(table.agentId),
    // Ensure unique version per agent
    unique("agent_versions_agentId_version_unique").on(table.agentId, table.version),
  ]
);
```

### Schema Change: Add archivedAt to agents Table
```typescript
// Add to existing agents table definition:
archivedAt: timestamp("archived_at"), // null = active, set = archived
```

### tRPC Feedback Router
```typescript
// Consistent with existing router patterns
const agentFeedbackRouter = t.router({
  create: protectedProcedure
    .input(z.object({
      agentId: z.string().uuid(),
      executionId: z.string().uuid().optional(),
      rating: z.enum(["positive", "negative"]),
      correction: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(agentFeedback)
        .values({
          userId: ctx.user.id,
          agentId: input.agentId,
          executionId: input.executionId,
          rating: input.rating,
          correction: input.correction,
        })
        .returning();

      // Fire-and-forget: check if evolution should be triggered
      checkAndEvolveAgent(input.agentId, ctx.user.id).catch((err) =>
        console.error("Prompt evolution check failed:", err)
      );

      return row!;
    }),

  listByAgent: protectedProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(agentFeedback)
        .where(and(
          eq(agentFeedback.agentId, input.agentId),
          eq(agentFeedback.userId, ctx.user.id),
        ))
        .orderBy(desc(agentFeedback.createdAt));
    }),
});
```

### tRPC Agent Version Procedures
```typescript
// Add to existing agentRouter:
const agentVersionRouter = t.router({
  list: protectedProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify agent belongs to user
      const [agent] = await ctx.db.select().from(agents)
        .where(and(eq(agents.id, input.agentId), eq(agents.userId, ctx.user.id)));
      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db
        .select()
        .from(agentVersions)
        .where(eq(agentVersions.agentId, input.agentId))
        .orderBy(desc(agentVersions.version))
        .limit(20);
    }),

  revert: protectedProcedure
    .input(z.object({
      agentId: z.string().uuid(),
      versionId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const [agent] = await ctx.db.select().from(agents)
        .where(and(eq(agents.id, input.agentId), eq(agents.userId, ctx.user.id)));
      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });

      // Get the target version
      const [targetVersion] = await ctx.db.select().from(agentVersions)
        .where(eq(agentVersions.id, input.versionId));
      if (!targetVersion) throw new TRPCError({ code: "NOT_FOUND" });

      // Save current as new version before reverting
      await saveAgentVersion(ctx.db, input.agentId, agent, "manual", "Reverted to version " + targetVersion.version);

      // Update agent with the reverted prompt
      const [updated] = await ctx.db.update(agents)
        .set({ systemPrompt: targetVersion.systemPrompt, updatedAt: new Date() })
        .where(eq(agents.id, input.agentId))
        .returning();

      return updated!;
    }),
});
```

### Background Evolution Check Function
```typescript
// apps/server/src/agents/prompt-evolver.ts
async function checkAndEvolveAgent(agentId: string, userId: string) {
  // Get agent
  const [agent] = await db.select().from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.userId, userId)));
  if (!agent) return;

  // Get the last evolution timestamp (from agentVersions where source = 'evolution')
  const [lastEvolution] = await db.select()
    .from(agentVersions)
    .where(and(
      eq(agentVersions.agentId, agentId),
      eq(agentVersions.changeSource, "evolution"),
    ))
    .orderBy(desc(agentVersions.createdAt))
    .limit(1);

  // Get feedback since last evolution
  const feedbackSince = lastEvolution
    ? await db.select({
        id: agentFeedback.id,
        rating: agentFeedback.rating,
        correction: agentFeedback.correction,
        executionId: agentFeedback.executionId,
        createdAt: agentFeedback.createdAt,
      })
      .from(agentFeedback)
      .where(and(
        eq(agentFeedback.agentId, agentId),
        gt(agentFeedback.createdAt, lastEvolution.createdAt),
      ))
    : await db.select({
        id: agentFeedback.id,
        rating: agentFeedback.rating,
        correction: agentFeedback.correction,
        executionId: agentFeedback.executionId,
        createdAt: agentFeedback.createdAt,
      })
      .from(agentFeedback)
      .where(eq(agentFeedback.agentId, agentId));

  // Check threshold: need 3+ feedback items with at least 1 negative or correction
  if (feedbackSince.length < 3) return;
  const hasActionable = feedbackSince.some(
    f => f.rating === "negative" || f.correction
  );
  if (!hasActionable) return;

  // Enrich feedback with execution context
  const enrichedFeedback = await Promise.all(
    feedbackSince.map(async (f) => {
      if (!f.executionId) return { ...f, task: "", result: "" };
      const [exec] = await db.select().from(agentExecutions)
        .where(eq(agentExecutions.id, f.executionId));
      return {
        rating: f.rating,
        correction: f.correction,
        task: exec?.task ?? "",
        result: exec?.result ?? "",
      };
    })
  );

  // Run evolution
  const revision = await evolveAgentPrompt(
    agentId, agent.systemPrompt, enrichedFeedback, modelId
  );
  if (!revision) return;

  // Save current version
  await saveAgentVersion(db, agentId, agent, "evolution", revision.changesSummary);

  // Update agent with revised prompt
  await db.update(agents)
    .set({ systemPrompt: revision.revisedPrompt, updatedAt: new Date() })
    .where(eq(agents.id, agentId));
}
```

### Feedback UI in AgentResultCard
```typescript
// Extend the existing AgentResultCard from Phase 3
function FeedbackButtons({
  executionId,
  agentId,
}: {
  executionId: string;
  agentId: string;
}) {
  const [submitted, setSubmitted] = useState<"positive" | "negative" | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionText, setCorrectionText] = useState("");
  const feedbackMut = trpc.agentFeedback.create.useMutation({
    onSuccess: () => setSubmitted(feedbackMut.variables?.rating ?? null),
  });

  if (submitted && !showCorrection) {
    return (
      <div className="mt-2 flex items-center gap-2 border-t border-neutral-200 pt-2 text-sm text-neutral-500">
        {submitted === "positive" ? "Thanks for the feedback" : "Noted -- this will help improve future results"}
        {submitted === "negative" && !correctionText && (
          <button
            onClick={() => setShowCorrection(true)}
            className="text-blue-600 hover:underline"
          >
            Add details
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 border-t border-neutral-200 pt-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => feedbackMut.mutate({ executionId, agentId, rating: "positive" })}
          className="rounded p-1.5 text-neutral-500 hover:bg-green-50 hover:text-green-600"
          disabled={!!submitted}
          aria-label="Good result"
        >
          {/* thumbs up icon or text */}
          +1
        </button>
        <button
          onClick={() => {
            feedbackMut.mutate({ executionId, agentId, rating: "negative" });
            setShowCorrection(true);
          }}
          className="rounded p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-600"
          disabled={!!submitted}
          aria-label="Poor result"
        >
          {/* thumbs down icon or text */}
          -1
        </button>
      </div>
      {showCorrection && (
        <div className="mt-2 space-y-2">
          <textarea
            value={correctionText}
            onChange={(e) => setCorrectionText(e.target.value)}
            placeholder="What should have been different?"
            className="w-full rounded border border-neutral-300 p-2 text-sm"
            rows={2}
          />
          <button
            onClick={() => {
              feedbackMut.mutate({
                executionId,
                agentId,
                rating: "negative",
                correction: correctionText,
              });
              setShowCorrection(false);
            }}
            className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
          >
            Submit correction
          </button>
        </div>
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual prompt editing by developer | LLM meta-prompting for prompt refinement (PromptWizard, Arize Prompt Learning) | 2024-2025 | Users don't need prompt engineering skills; system improves autonomously |
| Physical delete for agent removal | Soft-delete with archivedAt timestamp | Standard practice | Preserves history, enables unarchive, safer for users |
| No version tracking | Explicit version table with changeSource tracking | Industry standard | Enables rollback, audit trail, understanding of why prompt changed |
| Simple rating (stars) | Binary thumbs + optional text correction | 2024-2025 (ChatGPT, Claude patterns) | Binary signal is clearer; text correction provides actionable improvement data |

**Deprecated/outdated:**
- Star ratings for LLM outputs: Binary thumbs up/down is the industry standard (OpenAI, Anthropic, Google all use it). Star ratings add cognitive load without proportional signal value.
- Prompt A/B testing for per-user evolution: Overkill for a single-user agent system. A/B testing is for platform-wide optimization, not individual customization.

## Open Questions

1. **Evolution notification UX**
   - What we know: The system should not silently change prompts. Users need to know when an agent has evolved.
   - What's unclear: Should this be a banner on the agents page, a notification badge, or an inline message in chat the next time the agent is used?
   - Recommendation: Show a "Recently improved" badge on the agent card in the agents page + include a brief "This agent was recently improved based on your feedback" note the first time the evolved agent is used in chat. Store a `lastEvolvedAt` timestamp on the agent for this.

2. **Evolution model selection**
   - What we know: The meta-prompting pipeline needs a capable model to produce good prompt revisions. The user's configured model might be a local Ollama model which may not be strong enough for meta-prompting.
   - What's unclear: Should we always use a specific model for evolution, or use whatever the user has configured?
   - Recommendation: Use a dedicated `PROMPT_EVOLUTION_MODEL` env var (defaulting to the same model used for fact extraction, `COACH_FACT_MODEL`). This allows operators to set a strong model for evolution regardless of what users pick for chat.

3. **Feedback on coaching responses vs. agent results**
   - What we know: EVOL-01 specifies feedback on "agent outputs". Coaching responses (when the chief-of-staff responds directly without dispatching) are not agent outputs.
   - What's unclear: Should users be able to give feedback on all coaching responses, or only on dispatched agent results?
   - Recommendation: For Phase 4, limit feedback to dispatched agent results only (tied to agentExecutions). Coaching response feedback is a separate feature for a future phase.

4. **Maximum evolution frequency**
   - What we know: Evolution is triggered by feedback accumulation. A user who gives lots of feedback quickly could trigger many evolutions in a short time.
   - What's unclear: Should there be a cooldown period between evolutions?
   - Recommendation: Add a minimum 1-hour cooldown between evolutions for the same agent. Check `lastEvolvedAt` before running the pipeline.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `apps/server/src/memory/fact-extractor.ts` -- verified pattern for background `generateText` + `Output.object` pipeline
- Existing codebase: `apps/server/src/db/schema.ts` -- verified table definition patterns, indexing conventions
- Existing codebase: `apps/server/src/trpc/router.ts` -- verified tRPC router patterns, protected procedures
- Phase 3 research and plans: `.planning/phases/03-agent-system/03-RESEARCH.md` -- agent table schema, execution tracking, tool patterns
- AI SDK 6 official docs: generateText API -- https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text

### Secondary (MEDIUM confidence)
- PromptWizard (Microsoft Research) -- feedback-driven prompt optimization architecture: https://www.microsoft.com/en-us/research/blog/promptwizard-the-future-of-prompt-optimization-through-feedback-driven-self-evolving-prompts/
- Arize AI Prompt Learning -- English feedback to optimize LLM systems: https://arize.com/blog/prompt-learning-using-english-feedback-to-optimize-llm-systems/
- LaunchDarkly -- prompt versioning and management patterns: https://launchdarkly.com/blog/prompt-versioning-and-management/
- Drizzle ORM soft delete patterns -- community guide: https://subtopik.com/@if-loop/guides/implementing-soft-deletions-with-drizzle-orm-and-postgresql-s2qauA

### Tertiary (LOW confidence)
- None -- all claims verified with codebase patterns or official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed; all patterns verified against existing codebase
- Architecture: HIGH - Meta-prompting pipeline follows exact same pattern as fact-extractor; DB schema follows existing conventions
- Pitfalls: HIGH - Prompt drift, feedback quality, and evolution frequency are well-documented concerns in the prompt optimization literature
- Code examples: HIGH - Schema patterns copied from existing schema.ts; tRPC patterns from existing router.ts; generateText pattern from existing fact-extractor.ts

**Research date:** 2026-02-14
**Valid until:** 2026-03-14 (stable domain -- feedback collection and versioning patterns don't change rapidly)
