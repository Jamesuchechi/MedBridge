CREATE TABLE "drug_availability_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"drug_id" uuid,
	"drug_name" text NOT NULL,
	"is_in_stock" boolean NOT NULL,
	"reported_by" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drug_price_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"drug_id" uuid,
	"drug_name" text NOT NULL,
	"price" integer NOT NULL,
	"quantity" text,
	"reported_by" text,
	"moderation_status" text DEFAULT 'pending' NOT NULL,
	"flag_reason" text,
	"moderated_by" text,
	"moderation_note" text,
	"moderated_at" timestamp,
	"is_auto_flagged" boolean DEFAULT false,
	"auto_flag_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drug_query_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"drug_id" uuid,
	"query" text NOT NULL,
	"query_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"admin_id" text NOT NULL,
	"action" text NOT NULL,
	"previous_status" text,
	"new_status" text,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pharmacies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"state" text NOT NULL,
	"lga" text,
	"phone" text,
	"email" text,
	"lat" integer,
	"lng" integer,
	"osm_id" text,
	"osm_type" text,
	"opening_hours" text,
	"website" text,
	"is_verified" boolean DEFAULT false,
	"is_closed" boolean DEFAULT false,
	"trust_score" integer DEFAULT 50,
	"report_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pharmacies_osm_id_unique" UNIQUE("osm_id")
);
--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "nafdac_number" text;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "brand_names" text;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "uses" text;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "contraindications" text;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "side_effects" text;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "interactions" text;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "price_range_min" integer;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "price_range_max" integer;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "requires_prescription" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "controlled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "atc_code" text;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "icd_indications" text;--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN "vaccinations" text;--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN "medical_history" text;--> statement-breakpoint
ALTER TABLE "drug_availability_reports" ADD CONSTRAINT "drug_availability_reports_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_availability_reports" ADD CONSTRAINT "drug_availability_reports_drug_id_drugs_id_fk" FOREIGN KEY ("drug_id") REFERENCES "public"."drugs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_price_reports" ADD CONSTRAINT "drug_price_reports_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_price_reports" ADD CONSTRAINT "drug_price_reports_drug_id_drugs_id_fk" FOREIGN KEY ("drug_id") REFERENCES "public"."drugs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_query_logs" ADD CONSTRAINT "drug_query_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_query_logs" ADD CONSTRAINT "drug_query_logs_drug_id_drugs_id_fk" FOREIGN KEY ("drug_id") REFERENCES "public"."drugs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_audit_log" ADD CONSTRAINT "moderation_audit_log_report_id_drug_price_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."drug_price_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drugs" DROP COLUMN "price_range";--> statement-breakpoint
ALTER TABLE "drugs" ADD CONSTRAINT "drugs_nafdac_number_unique" UNIQUE("nafdac_number");