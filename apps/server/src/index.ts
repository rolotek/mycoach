import "./load-env";

if (!process.env.DATABASE_URL?.trim()) {
  console.error(
    "DATABASE_URL is not set. Add it to the repo root .env (e.g. DATABASE_URL=postgresql://mycoach:mycoach@localhost:5432/mycoach)"
  );
  process.exit(1);
}

import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { trpcServer } from "@hono/trpc-server";
import { auth } from "./auth";
import { sessionMiddleware } from "./middleware/auth";
import { appRouter } from "./trpc/router";
import { createContext } from "./trpc/context";

const corsOptions = {
  origin: process.env.WEB_URL || "http://localhost:3000",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["POST", "GET", "OPTIONS"],
  credentials: true,
};

const app = new Hono<{
  Variables: {
    user: (typeof auth)["$Infer"]["Session"]["user"] | null;
    session: (typeof auth)["$Infer"]["Session"]["session"] | null;
  };
}>();

// CORS — before auth routes (see research Pitfall 1)
app.use("/api/auth/*", cors(corsOptions));
app.use("/trpc/*", cors(corsOptions));

// Better Auth handler
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Session middleware for all other routes
app.use("*", sessionMiddleware);

// tRPC
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: async (_opts, c) => createContext({ req: c.req.raw }),
  })
);

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

const port = Number(process.env.PORT) || 3001;
console.log(`Server running on port ${port}`);
serve({ fetch: app.fetch, port });

export default app;
