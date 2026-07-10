CREATE TABLE "owners" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "owners_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"shop_name" text NOT NULL,
	"owner_id" integer NOT NULL,
	"city" text NOT NULL,
	"address" text,
	"num_chairs" integer DEFAULT 1 NOT NULL,
	"num_barbers" integer DEFAULT 1 NOT NULL,
	"is_open" boolean DEFAULT true NOT NULL,
	"is_paused" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"paused_until" timestamp,
	"open_time" text DEFAULT '09:00' NOT NULL,
	"close_time" text DEFAULT '20:00' NOT NULL,
	"profile_photo" text,
	"interior_photos" json DEFAULT '[]'::json,
	"portfolio_photos" json DEFAULT '[]'::json,
	"pincode" text,
	"latitude" text,
	"longitude" text,
	"open_days" json DEFAULT '[0,1,2,3,4,5,6]'::json,
	"open_hours" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shops_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer NOT NULL,
	"name" text NOT NULL,
	"price" integer NOT NULL,
	"duration_minutes" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"slot_date" text NOT NULL,
	"slot_time" text NOT NULL,
	"slot_end_time" text NOT NULL,
	"chair_number" integer NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"payment_type" text DEFAULT 'token' NOT NULL,
	"amount_paid" integer DEFAULT 1 NOT NULL,
	"total_amount" integer NOT NULL,
	"arrival_otp" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"otp" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;