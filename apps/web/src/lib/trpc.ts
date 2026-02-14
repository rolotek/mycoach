import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@mycoach/server/trpc";

export const trpc = createTRPCReact<AppRouter>();
