import { auth } from "../auth";
import { db } from "../db";

export async function createContext(opts: { req: Request }) {
  const session = await auth.api.getSession({
    headers: opts.req.headers,
  });
  return {
    user: session?.user ?? null,
    session: session?.session ?? null,
    db,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
