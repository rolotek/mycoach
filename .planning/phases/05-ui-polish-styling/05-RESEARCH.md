# Phase 5: UI Polish & Styling - Research

**Researched:** 2026-02-14
**Domain:** Design system, component library, responsive layout, Tailwind CSS v4
**Confidence:** HIGH

## Summary

This phase transforms a functional but unstyled Next.js app into a polished, professionally designed product. The app has 11 pages across auth (login, signup), dashboard, chat (list + detail with sidebar), agents (list + detail), memory, documents, and settings. All pages currently use raw Tailwind utility classes with no shared design system, no reusable component library, no font configuration, no dark mode, and minimal responsive design.

The codebase already uses **Tailwind CSS v4** (`@tailwindcss/postcss ^4.0.0`) with a minimal `globals.css` containing only `@import "tailwindcss"`. There is no `tailwind.config` file (correct for v4), no `postcss.config` file (needs to be added), no shared UI components, and no `components.json`. The project is a Turborepo monorepo with `apps/web` (Next.js 15, React 19) and `apps/server` (Hono).

**Primary recommendation:** Adopt shadcn/ui as the component library foundation. It is fully compatible with Tailwind CSS v4, React 19, and Next.js 15. Install components directly into `apps/web/src/components/ui/` (not a separate packages/ui workspace -- that would be overengineering for a single-app monorepo). Build an app shell with sidebar navigation, establish design tokens via CSS variables in `globals.css`, and systematically restyle every page using shadcn/ui primitives.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tailwindcss | ^4.0.0 | Utility-first CSS (already installed) | Already in the project; v4 is CSS-first with @theme |
| @tailwindcss/postcss | ^4.0.0 | PostCSS integration (already installed) | Required for Next.js + Tailwind v4 |
| shadcn/ui | latest (CLI) | Component primitives (Button, Card, Dialog, etc.) | Copy-paste components; full Tailwind v4 + React 19 support; no runtime dependency lock-in |
| next-themes | latest | Dark mode toggle with system preference | Official recommendation from shadcn/ui docs for Next.js dark mode |
| tw-animate-css | latest | CSS animation utilities for Tailwind v4 | Replaces deprecated tailwindcss-animate; required by shadcn/ui components |
| lucide-react | latest | Icon library | Default icon library for shadcn/ui; tree-shakable; 1600+ icons |
| clsx | latest | Conditional class composition | Part of the cn() utility pattern used by all shadcn/ui components |
| tailwind-merge | latest | Intelligent Tailwind class conflict resolution | Part of the cn() utility pattern; prevents duplicate/conflicting classes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-markdown | latest | Render markdown in chat messages | Replace the hand-rolled renderMarkdown() in message-list.tsx and agent-result.tsx |
| remark-gfm | latest | GitHub Flavored Markdown support | Tables, strikethrough, task lists in chat messages |
| next/font | (built-in) | Font optimization | Load Inter or Geist font with zero layout shift |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn/ui | Radix primitives directly | More control but much more work; shadcn/ui wraps Radix with Tailwind already |
| shadcn/ui | Headless UI | Fewer components; less ecosystem support for Tailwind v4 |
| next-themes | Manual dark mode | next-themes handles SSR hydration, FOUC prevention, system preference -- don't hand-roll |
| lucide-react | heroicons | heroicons has fewer icons; lucide is shadcn/ui default |
| react-markdown | Custom renderMarkdown | Current hand-rolled version is fragile (only handles bold + lists); react-markdown handles full spec safely |

**Installation:**
```bash
# From apps/web directory:

# 1. Create postcss.config.mjs (required for shadcn/ui init)
# 2. Run shadcn init
npx shadcn@latest init

# 3. Add required dependencies
npm install next-themes react-markdown remark-gfm

# 4. Add shadcn/ui components as needed
npx shadcn@latest add button card input textarea label badge dialog dropdown-menu separator skeleton scroll-area sheet sidebar tabs tooltip avatar
```

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
├── app/
│   ├── globals.css              # Design tokens + @theme inline + dark mode
│   ├── layout.tsx               # Font, ThemeProvider, metadata
│   ├── (auth)/                  # Login, signup (no sidebar)
│   └── (app)/
│       ├── layout.tsx           # App shell: SidebarProvider + Sidebar + SidebarInset
│       ├── dashboard/page.tsx
│       ├── chat/
│       │   ├── page.tsx
│       │   ├── [id]/page.tsx
│       │   └── components/      # Chat-specific components (already exists)
│       ├── agents/
│       ├── memory/
│       ├── documents/
│       └── settings/
├── components/
│   ├── ui/                      # shadcn/ui primitives (Button, Card, etc.)
│   ├── app-sidebar.tsx          # Main navigation sidebar
│   ├── theme-provider.tsx       # next-themes wrapper
│   ├── theme-toggle.tsx         # Light/dark/system toggle
│   ├── page-header.tsx          # Consistent page title + description
│   └── auth-guard.tsx           # Already exists
├── hooks/
│   └── use-coaching-chat.ts     # Already exists
└── lib/
    ├── utils.ts                 # cn() utility (created by shadcn init)
    ├── auth-client.ts           # Already exists
    └── trpc.ts                  # Already exists
```

### Pattern 1: App Shell with Sidebar Navigation
**What:** A persistent sidebar for navigation across all (app) routes, collapsing to icons on smaller screens and sliding in as a sheet on mobile.
**When to use:** All authenticated pages ((app) route group).
**Example:**
```typescript
// apps/web/src/app/(app)/layout.tsx
// Source: https://ui.shadcn.com/docs/components/radix/sidebar
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthGuard } from "@/components/auth-guard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 items-center gap-2 border-b px-4">
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
```

### Pattern 2: Design Tokens via CSS Variables + @theme inline
**What:** Define all colors, radii, and spacing as CSS variables in `:root` / `.dark`, then map them to Tailwind utilities via `@theme inline`.
**When to use:** globals.css -- this is the single source of truth for the entire design system.
**Example:**
```css
/* Source: https://ui.shadcn.com/docs/installation/manual */
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0.625rem;
  /* ... card, popover, sidebar, chart variables */
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... all dark overrides */
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  /* ... all color mappings */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground; }
}
```

### Pattern 3: Consistent Page Layout
**What:** Every page follows a consistent header + content structure.
**When to use:** All pages within the app shell.
**Example:**
```typescript
// Reusable page header component
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
```

### Pattern 4: Dark Mode Integration
**What:** Use next-themes ThemeProvider wrapping the app, with a toggle component.
**When to use:** Root layout wraps everything; toggle available in sidebar footer or settings.
**Example:**
```typescript
// Source: https://ui.shadcn.com/docs/dark-mode/next
// components/theme-provider.tsx
"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

// app/layout.tsx
<html lang="en" suppressHydrationWarning>
  <body>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <Providers>{children}</Providers>
    </ThemeProvider>
  </body>
</html>
```

### Anti-Patterns to Avoid
- **Inline color values instead of design tokens:** Never use `bg-blue-600` directly. Use `bg-primary` so the design system stays consistent and dark mode works automatically.
- **Duplicate renderMarkdown implementations:** The codebase currently has TWO identical hand-rolled markdown renderers (message-list.tsx and agent-result.tsx). Replace both with a single shared component using react-markdown.
- **No loading/skeleton states:** The current "Loading..." text strings should become proper Skeleton components for a polished feel.
- **Fixed-width sidebar on mobile:** The current chat sidebar is `w-64` with no mobile responsiveness. Use shadcn/ui Sidebar component which handles offcanvas mobile and collapsible desktop automatically.
- **Raw HTML elements instead of components:** Don't use `<button>` with raw Tailwind classes when a `<Button>` component exists with proper variants, focus rings, and disabled states.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown rendering | Custom regex-based parser | react-markdown + remark-gfm | Current implementation misses headers, code blocks, links, images, tables |
| Dark mode toggle + persistence | Custom localStorage + class toggle | next-themes | Handles SSR, FOUC, system preference, hydration |
| Dropdown menus | Custom click-outside detection | shadcn/ui DropdownMenu (Radix) | Accessibility (keyboard nav, ARIA), positioning, portal rendering |
| Dialog/modals | Custom overlay + focus trap | shadcn/ui Dialog (Radix) | Focus trapping, escape handling, screen reader support, scroll lock |
| Toast notifications | Custom notification system | shadcn/ui Sonner | Animation, stacking, auto-dismiss, accessible |
| Loading skeletons | Pulsing divs | shadcn/ui Skeleton | Consistent shimmer animation, composable with layout |
| Sidebar navigation | Fixed aside element | shadcn/ui Sidebar | Mobile offcanvas, collapsible, keyboard accessible, persisted state |
| Class composition | String concatenation | cn() (clsx + tailwind-merge) | Handles conditional classes and Tailwind conflict resolution |

**Key insight:** Every UI primitive in this app (buttons, inputs, cards, badges, dropdowns) currently has its own bespoke Tailwind class strings that are inconsistent across pages. shadcn/ui provides a complete, pre-themed set of these primitives that work together as a system. Replacing raw elements with shadcn/ui components is the single highest-leverage change.

## Common Pitfalls

### Pitfall 1: Missing postcss.config.mjs
**What goes wrong:** shadcn/ui init fails or Tailwind v4 doesn't process CSS correctly in Next.js.
**Why it happens:** The current project has `@tailwindcss/postcss` installed but no `postcss.config.mjs` file. Next.js may auto-detect Tailwind, but shadcn/ui CLI requires an explicit PostCSS config.
**How to avoid:** Create `apps/web/postcss.config.mjs` with `export default { plugins: { "@tailwindcss/postcss": {} } }` before running shadcn init.
**Warning signs:** shadcn init errors, missing utility classes, styles not applying.

### Pitfall 2: Tailwind v4 @custom-variant Dark Mode Syntax
**What goes wrong:** Dark mode classes don't apply, or they apply inconsistently.
**Why it happens:** Tailwind v4 removed `darkMode: 'class'` from tailwind.config. Dark mode is now configured via `@custom-variant dark (&:is(.dark *));` in CSS. next-themes adds a `.dark` class to `<html>`, which must match this selector.
**How to avoid:** Add the `@custom-variant dark` directive in globals.css. Use `attribute="class"` in ThemeProvider props.
**Warning signs:** Dark mode toggle clicks but nothing changes visually.

### Pitfall 3: OKLCH Color Format Confusion
**What goes wrong:** Colors look wrong or CSS fails to parse.
**Why it happens:** shadcn/ui v4 uses OKLCH color format (`oklch(0.205 0 0)`) instead of HSL. Existing code uses raw Tailwind colors like `bg-blue-600` and `text-neutral-900`.
**How to avoid:** Use semantic tokens (`bg-primary`, `text-foreground`) instead of raw colors. Define all colors in the design tokens section of globals.css using OKLCH format.
**Warning signs:** Raw color classes mixed with semantic tokens; inconsistent appearance.

### Pitfall 4: Mobile Responsiveness Afterthought
**What goes wrong:** Pages look acceptable on desktop but are unusable on mobile (overlapping elements, unreadable text, unreachable buttons).
**Why it happens:** Current pages use `p-8` padding and fixed-width containers that don't adapt. The chat sidebar is always `w-64`.
**How to avoid:** Use the shadcn/ui Sidebar component (handles mobile offcanvas automatically). Use responsive padding (`p-4 md:p-6 lg:p-8`). Test at 375px width during development.
**Warning signs:** Horizontal scrolling on mobile, elements cut off, tiny touch targets.

### Pitfall 5: Incomplete Migration from Raw Classes
**What goes wrong:** Some pages use the new design system, others still have raw blue-600 buttons, creating visual inconsistency worse than the original.
**Why it happens:** Restyling 11 pages is tedious; it's easy to miss pages or components.
**How to avoid:** Create a checklist of all pages and components. Restyle in systematic order: design tokens first, then shared components, then page-by-page.
**Warning signs:** Visual audit reveals pages that "look different" from others.

### Pitfall 6: Chat Scroll Behavior Regression
**What goes wrong:** After restyling, the chat message list no longer auto-scrolls to bottom, or the input area moves unpredictably.
**Why it happens:** Changing the flex layout or adding a sidebar changes how `overflow-y-auto` and `flex-1` behave.
**How to avoid:** Use the pattern: `<main className="flex h-screen flex-col">` with message area `flex-1 overflow-y-auto` and input area pinned to bottom. Test with many messages.
**Warning signs:** Scroll position jumps, input disappears below fold, messages hidden behind header.

## Code Examples

Verified patterns from official sources:

### globals.css -- Complete Design Token Setup
```css
/* Source: https://ui.shadcn.com/docs/installation/manual (Tailwind v4) */
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.145 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.145 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.396 0.141 25.723);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0.269 0 0);
  --input: oklch(0.269 0 0);
  --ring: oklch(0.439 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(0.269 0 0);
  --sidebar-ring: oklch(0.439 0 0);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

### cn() Utility
```typescript
// Source: https://ui.shadcn.com/docs/installation/manual
// apps/web/src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Font Configuration
```typescript
// Source: Next.js docs - next/font
// apps/web/src/app/layout.tsx
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Replacing Raw Button with shadcn/ui Button
```typescript
// BEFORE (current codebase pattern):
<button
  type="submit"
  disabled={loading}
  className="w-full rounded bg-blue-600 py-2 px-4 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
>
  {loading ? "Signing in..." : "Sign in"}
</button>

// AFTER (with shadcn/ui):
import { Button } from "@/components/ui/button";

<Button type="submit" disabled={loading} className="w-full">
  {loading ? "Signing in..." : "Sign in"}
</Button>
```

### Chat Message Markdown Rendering
```typescript
// BEFORE: Hand-rolled regex in message-list.tsx and agent-result.tsx
function renderMarkdown(text: string) { /* brittle regex */ }

// AFTER: Proper markdown rendering
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function ChatMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        ul: ({ children }) => <ul className="ml-4 list-disc space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="ml-4 list-decimal space-y-1">{children}</ol>,
        code: ({ children }) => (
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">{children}</code>
        ),
      }}
    />
  );
}
```

## Current Codebase Audit

### Pages Inventory (11 pages, all need restyling)
| Page | Route | Current State | Key Components Needed |
|------|-------|---------------|----------------------|
| Home | `/` | Redirect only | None (keep as-is) |
| Login | `/login` | Basic form, raw inputs | Card, Input, Label, Button |
| Signup | `/signup` | Basic form, raw inputs | Card, Input, Label, Button |
| Dashboard | `/dashboard` | Links only, no visual hierarchy | Card grid, navigation links |
| Chat List | `/chat` | Redirect to new conversation | None (keep as-is) |
| Chat Detail | `/chat/[id]` | Sidebar + messages + input | Sidebar (replace custom), ScrollArea, ChatMarkdown |
| Agents List | `/agents` | Grid cards, inline form | Card, Dialog (for create/edit), Badge |
| Agent Detail | `/agents/[id]` | Version history, feedback | Card, Badge, Tabs, Collapsible |
| Memory | `/memory` | Categorized fact cards | Card, Badge, edit inline |
| Documents | `/documents` | Upload zone + list | Card, upload area styling, Badge |
| Settings | `/settings` | Provider/model selects | Card, Select, Button |

### Existing Styling Patterns (to be replaced)
- **Colors:** Raw Tailwind (`bg-blue-600`, `text-neutral-900`, `bg-neutral-50`) -- no design tokens
- **Buttons:** 3+ variants scattered as raw class strings (primary blue, outline neutral, destructive red)
- **Cards:** `rounded-lg border border-neutral-200 bg-white p-4 shadow-sm` repeated verbatim
- **Inputs:** `w-full rounded border border-neutral-300 px-3 py-2` repeated per input
- **Badges:** Various ad-hoc `rounded px-1.5 py-0.5 text-xs` with different colors
- **Loading states:** Plain text "Loading..." everywhere
- **Layout:** `min-h-screen bg-neutral-50 p-8` + `mx-auto max-w-{size}` on every page
- **No shared components:** Every page defines its own button/input/card styles inline

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tailwind.config.js | CSS-first @theme in globals.css | Tailwind v4 (Jan 2025) | No JS config needed; design tokens are CSS variables |
| HSL color format | OKLCH color format | shadcn/ui Tailwind v4 update (2025) | Better perceptual uniformity; wider color gamut |
| tailwindcss-animate plugin | tw-animate-css (pure CSS) | shadcn/ui March 2025 | No JS plugin; CSS-only animations |
| React.forwardRef | Direct ref prop (React 19) | React 19 (2024) | Simpler component APIs |
| darkMode: 'class' in config | @custom-variant dark in CSS | Tailwind v4 | CSS-first dark mode; no config file needed |

**Deprecated/outdated:**
- `tailwindcss-animate`: Deprecated by shadcn/ui in favor of `tw-animate-css`
- `tailwind.config.js`: Not needed with Tailwind v4 CSS-first approach
- `React.forwardRef`: Not needed with React 19's native ref prop support

## Open Questions

1. **Color palette preference: neutral vs. branded?**
   - What we know: The shadcn/ui default "Neutral" base color uses grayscale OKLCH values (shown in the examples above). Other options: Zinc, Slate, Stone, Gray.
   - What's unclear: Whether the user wants a fully neutral palette or a branded accent color (e.g., a specific blue/indigo for the coaching theme).
   - Recommendation: Start with the Neutral base color (matches current neutral-* usage). Add a branded `--primary` color if desired later. The design token system makes this a one-line change.

2. **Monorepo component placement: packages/ui vs apps/web?**
   - What we know: shadcn/ui supports both monorepo (packages/ui workspace) and single-app installation. This project has only one web app.
   - What's unclear: Whether a shared UI package adds value here.
   - Recommendation: Install directly into `apps/web/src/components/ui/`. A shared package only makes sense with multiple web apps. Avoids complexity of workspace aliases and separate components.json files.

3. **Font choice?**
   - What we know: No font is currently configured (browser default). Inter and Geist are common choices for modern SaaS apps.
   - What's unclear: User preference.
   - Recommendation: Use **Inter** via `next/font/google` -- widely used, excellent readability, free, zero layout shift with next/font optimization.

## Sources

### Primary (HIGH confidence)
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) -- Tailwind v4 compatibility, migration guide
- [shadcn/ui Theming docs](https://ui.shadcn.com/docs/theming) -- CSS variable tokens, @theme inline, OKLCH format
- [shadcn/ui Manual Installation](https://ui.shadcn.com/docs/installation/manual) -- Complete globals.css, cn() utility, setup steps
- [shadcn/ui Dark Mode (Next.js)](https://ui.shadcn.com/docs/dark-mode/next) -- next-themes integration
- [shadcn/ui Sidebar component](https://ui.shadcn.com/docs/components/radix/sidebar) -- Responsive sidebar architecture
- [shadcn/ui Monorepo docs](https://ui.shadcn.com/docs/monorepo) -- Monorepo setup and workspace configuration
- [Tailwind CSS v4 Dark Mode](https://tailwindcss.com/docs/dark-mode) -- @custom-variant dark syntax
- [Tailwind CSS v4 PostCSS installation](https://tailwindcss.com/docs/installation/using-postcss) -- postcss.config.mjs setup
- [Tailwind CSS v4 Theme variables](https://tailwindcss.com/docs/theme) -- @theme directive documentation
- Direct codebase analysis of all 11 pages and 7 components in apps/web/src/

### Secondary (MEDIUM confidence)
- [tw-animate-css GitHub](https://github.com/Wombosvideo/tw-animate-css) -- Animation replacement for tailwindcss-animate
- [next-themes integration guides](https://www.thingsaboutweb.dev/en/posts/dark-mode-with-tailwind-v4-nextjs) -- Verified with official shadcn/ui docs
- [react-markdown GitHub](https://github.com/remarkjs/react-markdown) -- Markdown rendering approach

### Tertiary (LOW confidence)
- None -- all key claims verified with primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- shadcn/ui explicitly supports Tailwind v4 + React 19 + Next.js 15; verified via official docs
- Architecture: HIGH -- sidebar pattern, design tokens, and dark mode are all documented in official shadcn/ui docs
- Pitfalls: HIGH -- identified from codebase analysis and official migration guides; postcss issue verified by inspecting project files

**Research date:** 2026-02-14
**Valid until:** 2026-03-14 (30 days -- stack is stable)
