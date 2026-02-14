import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  jsonb,
} from "drizzle-orm/pg-core";

export const userSettings = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  preferredProvider: varchar("preferred_provider", { length: 50 }).default(
    "anthropic"
  ),
  preferredModel: varchar("preferred_model", { length: 100 }).default(
    "anthropic:claude-sonnet-4-20250514"
  ),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
