CREATE TABLE "doctor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"gender" text,
	"phone" text,
	"mdcn_number" text NOT NULL,
	"mdcn_year" integer,
	"specialization" text NOT NULL,
	"sub_specialization" text,
	"years_experience" integer,
	"current_hospital" text,
	"hospital_state" text,
	"hospital_lga" text,
	"is_independent" boolean DEFAULT false NOT NULL,
	"bio" text,
	"languages" text DEFAULT '["English"]',
	"consultation_types" text DEFAULT '["In-person"]',
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"is_copilot_enabled" boolean DEFAULT false NOT NULL,
	"rejection_reason" text,
	"verified_by" uuid,
	"verified_at" timestamp,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "doctor_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "doctor_profiles_mdcn_number_unique" UNIQUE("mdcn_number")
);
--> statement-breakpoint
CREATE TABLE "doctor_verification_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"admin_id" uuid NOT NULL,
	"action" text NOT NULL,
	"previous_status" text,
	"new_status" text,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mdcn_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_verification_audit" ADD CONSTRAINT "doctor_verification_audit_doctor_id_doctor_profiles_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_verification_audit" ADD CONSTRAINT "doctor_verification_audit_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;