import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const botTokensTable = pgTable("bot_tokens", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type BotToken = typeof botTokensTable.$inferSelect;
