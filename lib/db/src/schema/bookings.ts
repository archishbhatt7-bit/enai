import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { shopsTable } from "./shops";
import { servicesTable } from "./services";

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull().references(() => shopsTable.id, { onDelete: "cascade" }),
  serviceId: integer("service_id").notNull().references(() => servicesTable.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  slotDate: text("slot_date").notNull(),
  slotTime: text("slot_time").notNull(),
  slotEndTime: text("slot_end_time").notNull(),
  chairNumber: integer("chair_number").notNull(),
  status: text("status").notNull().default("confirmed"),
  paymentType: text("payment_type").notNull().default("token"),
  amountPaid: integer("amount_paid").notNull().default(1),
  totalAmount: integer("total_amount").notNull(),
  arrivalOtp: text("arrival_otp"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
