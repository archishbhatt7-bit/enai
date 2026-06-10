import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shopsTable = pgTable("shops", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  shopName: text("shop_name").notNull(),
  ownerName: text("owner_name").notNull(),
  phone: text("phone").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  city: text("city").notNull(),
  address: text("address"),
  numChairs: integer("num_chairs").notNull().default(1),
  numBarbers: integer("num_barbers").notNull().default(1),
  isOpen: boolean("is_open").notNull().default(true),
  isPaused: boolean("is_paused").notNull().default(false),
  pausedUntil: timestamp("paused_until"),
  openTime: text("open_time").notNull().default("09:00"),
  closeTime: text("close_time").notNull().default("20:00"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertShopSchema = createInsertSchema(shopsTable).omit({ id: true, createdAt: true });
export type InsertShop = z.infer<typeof insertShopSchema>;
export type Shop = typeof shopsTable.$inferSelect;
