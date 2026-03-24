CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid,
	"patient_name" text NOT NULL,
	"patient_age" text NOT NULL,
	"patient_sex" text NOT NULL,
	"sending_doctor_id" uuid NOT NULL,
	"receiving_doctor_id" uuid,
	"receiving_facility" text,
	"specialty" text NOT NULL,
	"priority" text DEFAULT 'Routine' NOT NULL,
	"urgency_score" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"clinical_summary" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_sending_doctor_id_users_id_fk" FOREIGN KEY ("sending_doctor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_receiving_doctor_id_users_id_fk" FOREIGN KEY ("receiving_doctor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;