CREATE TABLE "clinic_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clinic_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "clinic_verification_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"admin_id" uuid NOT NULL,
	"action" text NOT NULL,
	"previous_status" text,
	"new_status" text,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "lga" text;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "cac_number" text;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "subscription_tier" text DEFAULT 'BASIC' NOT NULL;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "verification_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "admin_notes" text;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "verified_by" uuid;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "clinic_invitations" ADD CONSTRAINT "clinic_invitations_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_verification_audit" ADD CONSTRAINT "clinic_verification_audit_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_verification_audit" ADD CONSTRAINT "clinic_verification_audit_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;