import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const otpSessionsTable = pgTable("otp_sessions", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  otp: text("otp").notNull(),
  verified: boolean("verified").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOtpSessionSchema = createInsertSchema(otpSessionsTable).omit({ id: true, createdAt: true });
export type InsertOtpSession = z.infer<typeof insertOtpSessionSchema>;
export type OtpSession = typeof otpSessionsTable.$inferSelect;
