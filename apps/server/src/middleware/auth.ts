import { createMiddleware } from "hono/factory";
import { auth } from "../auth";

export const sessionMiddleware = createMiddleware(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});
