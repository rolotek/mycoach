# Phase 3: Agent System - Research

**Researched:** 2026-02-14
**Domain:** AI agent orchestration, tool-based delegation, human-in-the-loop approval
**Confidence:** HIGH

## Summary

Phase 3 adds a specialist agent system to the existing coaching app. The user creates named agents (each with a description and prompt), the system includes four starter templates, and a "chief of staff" routing layer suggests which agent to use before dispatching. Agent results appear as structured content inside the existing chat interface.

The existing codebase already uses AI SDK 6.0.86 with Hono, tRPC, Drizzle, and `streamText`/`tool` patterns. AI SDK 6 introduced `ToolLoopAgent`, `createAgentUIStreamResponse`, and `needsApproval` -- all of which map directly to the requirements. The chief-of-staff is modeled as a `ToolLoopAgent` whose tools are `needsApproval`-gated subagent dispatch tools. When the LLM decides to route to an agent, the SDK pauses for user confirmation before executing. This is the exact "suggest then confirm" pattern AGENT-03 requires, built natively into the SDK with no custom approval UI plumbing needed beyond rendering the approval-requested tool parts.

The key architectural insight is: each specialist agent becomes a tool on the chief-of-staff agent. Agent definitions (name, description, system prompt) are stored in a new `agents` table. At request time, the server reads the user's agents, dynamically builds tool definitions from them, and constructs a ToolLoopAgent. The `needsApproval: true` flag on each dispatch tool gives the user the confirm/deny step. After approval, the tool's execute function runs `generateText` (or `streamText` via a subagent) with the specialist's system prompt and returns structured results.

**Primary recommendation:** Use AI SDK 6 `ToolLoopAgent` with `needsApproval` tools for the chief-of-staff, `generateText` for specialist agent execution, and Drizzle `agents` + `agentExecutions` tables for persistence. No new libraries needed.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ai | 6.0.86 | ToolLoopAgent, tool, generateText, streamText, createAgentUIStreamResponse | Already installed; native agent support in v6 |
| @ai-sdk/react | 3.0.88 | useChat with tool part rendering, addToolApprovalResponse | Already installed; handles approval UI natively |
| drizzle-orm | 0.41.0 | Agent and execution persistence | Already installed; consistent with existing schema |
| zod | 3.23.8 | Agent output schemas, tool input validation | Already installed; used throughout |
| hono | 4.6.14 | Agent API route | Already installed |
| @trpc/server | 11.10.0 | Agent CRUD operations | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | - | - | All dependencies already in the project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ToolLoopAgent + needsApproval | Custom approval state machine | SDK handles the entire approval flow natively; custom approach adds hundreds of lines of state management |
| generateText for specialist execution | ToolLoopAgent subagent | generateText is simpler for single-shot specialist tasks; ToolLoopAgent adds multi-step overhead only needed for the chief-of-staff |
| Dynamic tool generation from DB | Hardcoded tools | Dynamic is required since users create custom agents; hardcoded only works for templates |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
apps/server/src/
  agents/
    chief-of-staff.ts    # ToolLoopAgent factory, builds from user's agent list
    agent-executor.ts    # Runs a single specialist agent via generateText
    agent-tools.ts       # Builds tool definitions from agent DB rows
    templates.ts         # Seed data for 4 starter agent templates
  db/
    schema.ts            # Add agents + agentExecutions tables
  trpc/
    router.ts            # Add agentRouter for CRUD
apps/web/src/
  app/(app)/agents/
    page.tsx             # Agent management UI (list, create, edit)
  app/(app)/chat/
    components/
      agent-approval.tsx # Renders approval-requested tool parts
      agent-result.tsx   # Renders structured agent output
```

### Pattern 1: Chief-of-Staff as ToolLoopAgent with Dynamic Tools
**What:** The chief-of-staff is a `ToolLoopAgent` whose tools are dynamically generated from the user's agent library. Each agent becomes a tool with `needsApproval: true`.
**When to use:** Every chat request where agent dispatch is possible (which is every request in Phase 3).
**Example:**
```typescript
// Source: AI SDK 6 docs - ToolLoopAgent + needsApproval
import { ToolLoopAgent, tool, stepCountIs } from "ai";
import { z } from "zod";

type AgentRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  systemPrompt: string;
};

function buildChiefOfStaff(agents: AgentRow[], model: LanguageModel) {
  const tools: Record<string, ReturnType<typeof tool>> = {};

  for (const agent of agents) {
    tools[`dispatch_${agent.slug}`] = tool({
      description: `Delegate to "${agent.name}": ${agent.description}`,
      inputSchema: z.object({
        task: z.string().describe("The specific task to delegate"),
        context: z.string().optional().describe("Additional context"),
      }),
      needsApproval: true,
      execute: async ({ task, context }) => {
        return executeSpecialistAgent(agent, task, context, model);
      },
    });
  }

  return new ToolLoopAgent({
    model,
    instructions: CHIEF_OF_STAFF_SYSTEM_PROMPT,
    tools,
    stopWhen: stepCountIs(5),
  });
}
```

### Pattern 2: Specialist Agent Execution via generateText
**What:** Each specialist agent runs as a single `generateText` call with the agent's system prompt. No multi-step looping needed for specialists in Phase 3.
**When to use:** When the chief-of-staff dispatches a task to a specialist after user approval.
**Example:**
```typescript
// Source: AI SDK 6 docs - generateText with Output.object
import { generateText, Output } from "ai";

async function executeSpecialistAgent(
  agent: AgentRow,
  task: string,
  context: string | undefined,
  model: LanguageModel
): Promise<{ agentName: string; result: string }> {
  const result = await generateText({
    model,
    system: agent.systemPrompt,
    prompt: context
      ? `Task: ${task}\n\nContext: ${context}`
      : `Task: ${task}`,
  });
  return { agentName: agent.name, result: result.text };
}
```

### Pattern 3: Approval UI via Tool Parts
**What:** The chat UI renders `approval-requested` tool parts as confirmation cards showing which agent the chief-of-staff wants to use, with approve/deny buttons.
**When to use:** When the assistant message contains tool parts in `approval-requested` state.
**Example:**
```typescript
// Source: AI SDK 6 docs - human-in-the-loop cookbook
// In message-list.tsx, handle tool parts:
if (part.type.startsWith("tool-dispatch_")) {
  switch (part.state) {
    case "approval-requested":
      return (
        <AgentApprovalCard
          agentName={extractAgentName(part.type)}
          task={part.input.task}
          onApprove={() =>
            addToolApprovalResponse({ id: part.approval.id, approved: true })
          }
          onDeny={() =>
            addToolApprovalResponse({ id: part.approval.id, approved: false })
          }
        />
      );
    case "output-available":
      return <AgentResultCard result={part.output} />;
    case "output-denied":
      return <AgentDeniedCard />;
  }
}
```

### Pattern 4: Integration with Existing Chat Route
**What:** Replace the current `streamText` call with `createAgentUIStreamResponse` when agents are available for the user. Fall back to existing behavior when no agents exist.
**When to use:** The `/api/chat` endpoint.
**Example:**
```typescript
// Source: AI SDK 6 docs - createAgentUIStreamResponse
import { createAgentUIStreamResponse } from "ai";

// In chat-route.ts:
const userAgents = await db
  .select()
  .from(agents)
  .where(eq(agents.userId, user.id));

if (userAgents.length > 0) {
  const chiefOfStaff = buildChiefOfStaff(userAgents, getModel(modelId));
  return createAgentUIStreamResponse({
    agent: chiefOfStaff,
    uiMessages: messages,
  });
}
// else: fall back to existing streamText behavior
```

### Anti-Patterns to Avoid
- **Building custom approval state machines:** The SDK handles approval flow natively via `needsApproval` + `addToolApprovalResponse`. Do not build WebSocket-based approval or polling mechanisms.
- **Giving specialists multi-step tool loops:** In Phase 3, specialists produce a single output. Adding ToolLoopAgent for specialists adds unnecessary complexity. Save that for Phase 4.
- **Storing agent prompts in code:** Agent definitions must be in the database since users create custom agents (AGENT-01). Only the 4 starter templates are defined in code as seed data.
- **Using `maxSteps` instead of `stopWhen`:** `stopWhen` is the modern AI SDK 6 pattern. `maxSteps` still works but `stopWhen` with `stepCountIs()` is more explicit and composable.
- **Conflating the chief-of-staff with the coaching persona:** The chief-of-staff is a routing/delegation layer. The existing coaching mode (coaching/task) should continue to work when no agent dispatch is needed. The chief-of-staff should detect when a request is a delegation task vs. a coaching question.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tool approval flow | Custom WebSocket/polling approval state | AI SDK `needsApproval` + `addToolApprovalResponse` | SDK handles the full request-approve-execute lifecycle including edge cases (denial, timeout, auto-continue) |
| Streaming agent results to UI | Custom SSE protocol for agent output | `createAgentUIStreamResponse` or `toUIMessageStreamResponse` | Handles serialization, tool part states, step boundaries natively |
| Agent routing decision | If/else chain or keyword matching | LLM-based routing via chief-of-staff ToolLoopAgent | The LLM understands intent better than regex; the tool description guides routing naturally |
| Tool part state management | Manual state tracking in frontend | `useChat` tool part states (`approval-requested`, `output-available`, etc.) | SDK manages the full lifecycle and auto-sends after approval with `sendAutomaticallyWhen` |
| Agent slug generation | Custom slug logic | Simple `name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")` | Slugs only need to be unique per user and valid as tool name suffixes |

**Key insight:** AI SDK 6 was specifically designed for this exact pattern -- multi-step agents with human-in-the-loop approval. The `needsApproval` flag, `ToolLoopAgent`, and `createAgentUIStreamResponse` eliminate hundreds of lines of custom plumbing that would otherwise be needed.

## Common Pitfalls

### Pitfall 1: Tool Names Must Be Valid Identifiers
**What goes wrong:** If agent names contain spaces or special characters, using them directly as tool names causes runtime errors.
**Why it happens:** AI SDK tool names are object keys and must follow identifier rules.
**How to avoid:** Generate a slug from the agent name (e.g., `dispatch_contract_attorney`) and use that as the tool key. Store the slug in the DB.
**Warning signs:** "Invalid tool name" errors at runtime.

### Pitfall 2: Dynamic Tool Types and Part Rendering
**What goes wrong:** Since tools are generated dynamically, TypeScript cannot infer tool part types at compile time. Attempting to use strongly-typed tool part names like `tool-dispatch_contract_attorney` fails.
**Why it happens:** Tools are built at runtime from DB rows.
**How to avoid:** Use string prefix matching (`part.type.startsWith("tool-dispatch_")`) or the `dynamic-tool` type for rendering. Check for `toolName` property on tool parts.
**Warning signs:** TypeScript errors about unknown tool part types.

### Pitfall 3: Chief-of-Staff Over-Routing
**What goes wrong:** The chief-of-staff tries to route every single message to an agent, even simple coaching questions like "How are you?"
**Why it happens:** If the system prompt doesn't clearly delineate when to route vs. when to respond directly, the LLM defaults to using available tools.
**How to avoid:** System prompt must explicitly state: "Only suggest an agent when the user is asking for a specific deliverable or task. For coaching conversations, reflective questions, and general discussion, respond directly without routing." Set `toolChoice: "auto"` (not `"required"`).
**Warning signs:** Every message triggers an approval card.

### Pitfall 4: Agent Table Not Scoped to User
**What goes wrong:** Users see or can use other users' custom agents.
**Why it happens:** Missing `userId` filter in agent queries.
**How to avoid:** Every agent query must include `where(eq(agents.userId, ctx.user.id))`. Starter templates should be seeded per-user or loaded as system-level agents with a `null` userId plus the user's custom agents.
**Warning signs:** Users see agents they didn't create.

### Pitfall 5: Approval Flow Breaks on Page Refresh
**What goes wrong:** If the user refreshes the page while an approval is pending, the approval state is lost.
**Why it happens:** The approval state lives in the useChat stream, which resets on mount.
**How to avoid:** Persist conversation messages (already done in the existing chat route via `onFinish`). On reload, the conversation loads with the tool parts in their last known state. The user can re-send to trigger a new routing suggestion. The system prompt should handle "I previously suggested X" gracefully.
**Warning signs:** Users report "stuck" conversations after refresh.

### Pitfall 6: createAgentUIStreamResponse vs. toUIMessageStreamResponse
**What goes wrong:** Mixing up which response helper to use with Hono.
**Why it happens:** `createAgentUIStreamResponse` is for ToolLoopAgent and returns a Response. `toUIMessageStreamResponse` is for raw streamText and also returns a Response. Both work with Hono.
**How to avoid:** Use `createAgentUIStreamResponse` when using a ToolLoopAgent. Use `toUIMessageStreamResponse` when using raw streamText (fallback path).
**Warning signs:** Stream format errors on the client.

## Code Examples

Verified patterns from official sources:

### Database Schema for Agents
```typescript
// Pattern consistent with existing schema.ts
export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    systemPrompt: text("system_prompt").notNull(),
    isStarter: boolean("is_starter").default(false).notNull(),
    icon: text("icon"), // emoji or icon identifier
    outputSchema: jsonb("output_schema"), // optional structured output schema
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("agents_userId_idx").on(table.userId),
    // Unique slug per user
    index("agents_userId_slug_idx").on(table.userId, table.slug),
  ]
);

export const agentExecutions = pgTable(
  "agent_executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").references(
      () => conversations.id,
      { onDelete: "set null" }
    ),
    task: text("task").notNull(),
    result: text("result"),
    status: text("status").default("pending").notNull(), // pending, running, completed, failed, denied
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("agent_executions_userId_idx").on(table.userId),
    index("agent_executions_agentId_idx").on(table.agentId),
  ]
);
```

### Starter Agent Templates
```typescript
// Source: application-specific, consistent with AGENT-02
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
];
```

### Chief-of-Staff System Prompt
```typescript
// Source: application-specific
export const CHIEF_OF_STAFF_SYSTEM_PROMPT = `You are an executive coach and chief of staff. You have two capabilities:

1. **Direct Coaching**: For reflective questions, coaching conversations, advice, and general discussion, respond directly. Be empathetic, ask clarifying questions, and help the user think through decisions.

2. **Agent Delegation**: When the user asks for a specific deliverable or task (draft an email, review a contract, prepare for a meeting, research a topic), suggest dispatching to the most appropriate specialist agent. Use the dispatch tools available to you.

**When to delegate vs. respond directly:**
- "Help me think through this decision" -> Respond directly (coaching)
- "Draft an email to my team about the reorg" -> Delegate to comms writer
- "Review this contract clause" -> Delegate to contract attorney
- "I have a board meeting tomorrow" -> Delegate to meeting prep
- "What do we know about competitor X" -> Delegate to research analyst
- "How should I handle this conflict?" -> Respond directly (coaching)

When delegating, be specific about the task. Include relevant context from the conversation.
When the user denies a delegation, acknowledge it and either handle the task directly or suggest an alternative approach.`;
```

### tRPC Agent Router
```typescript
// Source: consistent with existing router.ts patterns
const agentRouter = t.router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(agents)
      .where(eq(agents.userId, ctx.user.id))
      .orderBy(agents.name);
  }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().min(1).max(500),
        systemPrompt: z.string().min(1),
        icon: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slug = input.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      const [row] = await ctx.db
        .insert(agents)
        .values({
          userId: ctx.user.id,
          name: input.name,
          slug,
          description: input.description,
          systemPrompt: input.systemPrompt,
          icon: input.icon,
        })
        .returning();
      return row!;
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().min(1).max(500).optional(),
        systemPrompt: z.string().min(1).optional(),
        icon: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      if (updates.name) {
        (updates as any).slug = updates.name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
      }
      const [row] = await ctx.db
        .update(agents)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(eq(agents.id, id), eq(agents.userId, ctx.user.id)))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(agents)
        .where(
          and(eq(agents.id, input.id), eq(agents.userId, ctx.user.id))
        );
      return { success: true };
    }),
});
```

### useChat with Approval Handling
```typescript
// Source: AI SDK 6 docs - human-in-the-loop cookbook
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";

export function useCoachingChat(chatId: string, mode: string = "auto") {
  return useChat({
    id: chatId,
    transport: new DefaultChatTransport({
      api: `${SERVER_URL}/api/chat`,
      credentials: "include",
      body: { chatId, mode },
    }),
    // Auto-send after user approves/denies all pending tool approvals
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| maxSteps for agent loops | stopWhen with stepCountIs() | AI SDK 5 (July 2025) | More explicit, composable stop conditions |
| Custom approval state machines | needsApproval flag on tools | AI SDK 6 (Dec 2025) | Eliminates custom approval plumbing |
| Raw streamText for agents | ToolLoopAgent class | AI SDK 6 (Dec 2025) | Encapsulates agent loop, reusable across endpoints |
| Manual SSE for streaming | createAgentUIStreamResponse | AI SDK 6 (Dec 2025) | First-class agent streaming with tool part states |
| Separate routing endpoint | Tools with descriptions for LLM routing | AI SDK 6 (Dec 2025) | LLM routes via tool selection; no separate classification step |

**Deprecated/outdated:**
- `maxSteps` parameter: Still functional but `stopWhen` is the recommended replacement in AI SDK 6.
- Manual agent loops with while/for: `ToolLoopAgent` encapsulates the loop pattern.

## Open Questions

1. **Starter template seeding strategy**
   - What we know: 4 starter templates need to exist for every user (AGENT-02)
   - What's unclear: Should templates be seeded on user registration, on first visit to agents page, or exist as system-level agents?
   - Recommendation: Seed on first visit to agent management page (lazy seeding). Check if user has any agents; if not, insert the 4 starters. This avoids bloating the registration flow.

2. **Chief-of-staff integration with existing coaching modes**
   - What we know: The existing chat has coaching/task modes. The chief-of-staff adds agent routing.
   - What's unclear: Should the chief-of-staff replace the existing mode detection, or layer on top?
   - Recommendation: Layer on top. The chief-of-staff system prompt should include the coaching persona and mode awareness. When no agent dispatch is needed, it behaves like the existing coach. The mode toggle continues to work.

3. **Agent output rendering in chat**
   - What we know: Agent results come back as tool part outputs in the message stream.
   - What's unclear: How structured should the output be? Plain text vs. JSON schema?
   - Recommendation: Start with plain text output from specialists (they return formatted markdown). Render tool output parts with a distinct "Agent Result" card UI. Structured JSON schemas can be added per-agent in Phase 4.

4. **Unique slug enforcement**
   - What we know: Tool names must be unique within a single ToolLoopAgent instance.
   - What's unclear: What if a user creates two agents with similar names that generate the same slug?
   - Recommendation: Add a unique constraint on (userId, slug) in the DB. On conflict, append a numeric suffix.

## Sources

### Primary (HIGH confidence)
- AI SDK 6 official docs: agents overview - https://ai-sdk.dev/docs/foundations/agents
- AI SDK 6 official docs: building agents - https://ai-sdk.dev/docs/agents/building-agents
- AI SDK 6 official docs: loop control - https://ai-sdk.dev/docs/agents/loop-control
- AI SDK 6 official docs: subagents - https://ai-sdk.dev/docs/agents/subagents
- AI SDK 6 official docs: tool calling - https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
- AI SDK 6 official docs: chatbot tool usage - https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage
- AI SDK 6 official docs: human-in-the-loop cookbook - https://ai-sdk.dev/cookbook/next/human-in-the-loop
- AI SDK 6 official docs: createAgentUIStreamResponse - https://ai-sdk.dev/docs/reference/ai-sdk-core/create-agent-ui-stream-response
- AI SDK 6 official docs: Hono integration - https://ai-sdk.dev/cookbook/api-servers/hono
- AI SDK 6 release blog - https://vercel.com/blog/ai-sdk-6

### Secondary (MEDIUM confidence)
- AI SDK workflow patterns - https://ai-sdk.dev/docs/agents/workflows
- Vercel community discussion on multi-agent delegation - https://community.vercel.com/t/multi-agent-workflow-delegate-agents-via-tool-call/26470

### Tertiary (LOW confidence)
- None -- all claims verified with official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed; AI SDK 6 agent APIs verified against official docs
- Architecture: HIGH - ToolLoopAgent + needsApproval maps precisely to requirements; verified with official examples and API reference
- Pitfalls: HIGH - Tool naming, dynamic types, and approval flow edge cases well-documented in SDK docs
- Code examples: MEDIUM - Schema and router patterns follow existing codebase conventions; agent-specific code adapted from official SDK examples

**Research date:** 2026-02-14
**Valid until:** 2026-03-14 (AI SDK is fast-moving but v6 is stable)
