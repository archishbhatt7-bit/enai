import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const photoStoreTable = pgTable("photo_store", {
  id: text("id").primaryKey(),
  contentType: text("content_type").notNull(),
  data: text("data").notNull(), // base64-encoded image data
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PhotoStore = typeof photoStoreTable.$inferSelect;
