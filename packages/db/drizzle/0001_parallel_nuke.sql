ALTER TABLE "health_profiles" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN "lga" text;--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN "weight" text;--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN "height" text;--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN "medications" text;--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN "family_history" text;--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN "emergency_name" text;--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN "emergency_phone" text;--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN "emergency_relation" text;--> statement-breakpoint
ALTER TABLE "health_profiles" ADD CONSTRAINT "health_profiles_user_id_unique" UNIQUE("user_id");