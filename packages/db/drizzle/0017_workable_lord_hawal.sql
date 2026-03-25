ALTER TYPE "public"."lab_status" ADD VALUE 'pending' BEFORE 'samples_collected';--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_clinic_id_clinics_id_fk";
--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_patient_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_encounter_id_encounters_id_fk";
--> statement-breakpoint
ALTER TABLE "lab_orders" DROP CONSTRAINT "lab_orders_patient_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "lab_orders" DROP CONSTRAINT "lab_orders_doctor_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "lab_orders" DROP CONSTRAINT "lab_orders_clinic_id_clinics_id_fk";
--> statement-breakpoint
ALTER TABLE "lab_orders" DROP CONSTRAINT "lab_orders_encounter_id_encounters_id_fk";
--> statement-breakpoint
ALTER TABLE "lab_orders" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "lab_orders" ALTER COLUMN "status" SET DATA TYPE "public"."lab_status" USING "status"::text::"public"."lab_status";--> statement-breakpoint
ALTER TABLE "lab_orders" ALTER COLUMN "status" SET DEFAULT 'ordered';--> statement-breakpoint
ALTER TABLE "lab_orders" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_orders" ALTER COLUMN "ordered_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_orders" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DROP TYPE "public"."lab_order_status";