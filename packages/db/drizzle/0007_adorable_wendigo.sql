CREATE TABLE "copilot_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"prompt_version" text NOT NULL,
	"input" text NOT NULL,
	"output" text,
	"status" text NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "copilot_audit_logs" ADD CONSTRAINT "copilot_audit_logs_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;