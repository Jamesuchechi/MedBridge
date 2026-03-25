import { pgTable, text, timestamp, boolean, uuid, pgEnum, date, integer, doublePrecision, decimal } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", [
  "PATIENT",
  "CLINICIAN",
  "CLINIC_STAFF",
  "CLINIC_ADMIN",
  "SUPER_ADMIN",
]);

export type UserRole = (typeof roleEnum.enumValues)[number];


export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  name: text("name"),
  role: roleEnum("role").default("PATIENT").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  mdcnVerified: boolean("mdcn_verified").default(false),
  clinicId: uuid("clinic_id"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clinics = pgTable("clinics", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  state: text("state"),
  lga: text("lga"),
  cacNumber: text("cac_number"),
  subscriptionTier: text("subscription_tier").default("BASIC").notNull(), // BASIC, PRO, ENTERPRISE
  verificationStatus: text("verification_status").default("pending").notNull(), // pending, approved, rejected
  adminNotes: text("admin_notes"),
  verifiedBy: uuid("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const healthProfiles = pgTable("health_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  dob: date("dob"),
  gender: text("gender"),
  phone: text("phone"),
  state: text("state"),
  lga: text("lga"),
  bloodGroup: text("blood_group"),
  genotype: text("genotype"),
  weight: text("weight"),
  height: text("height"),
  chronicConditions: text("chronic_conditions"), // JSON string array
  allergies: text("allergies"), // JSON string array of objects
  medications: text("medications"), // JSON string array of objects
  familyHistory: text("family_history"), // JSON string array
  vaccinations: text("vaccinations"), // JSON string array
  medicalHistory: text("medical_history"), // JSON string array (surgeries, hospitalizations)
  emergencyName: text("emergency_name"),
  emergencyPhone: text("emergency_phone"),
  emergencyRelation: text("emergency_relation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const symptomChecks = pgTable("symptom_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  symptoms: text("symptoms").notNull(), // JSON string or comma-separated
  analysis: text("analysis").notNull(), // AI JSON response
  urgency: text("urgency").notNull(), // green / amber / red
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const medicalDocuments = pgTable("medical_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // lab_result, prescription, etc.
  fileUrl: text("file_url").notNull(),
  extraction: text("extraction"), // AI JSON extraction
  status: text("status").default("pending").notNull(), // pending, processing, complete, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const drugs = pgTable("drugs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  genericName: text("generic_name").notNull(),
  nafdacNumber: text("nafdac_number").unique(),
  manufacturer: text("manufacturer"),
  category: text("category").notNull(),
  form: text("form"), // tablet, syrup, etc.
  strength: text("strength"),
  brandNames: text("brand_names"),
  uses: text("uses"),
  contraindications: text("contraindications"),
  sideEffects: text("side_effects"),
  interactions: text("interactions"),
  priceRangeMin: integer("price_range_min"),
  priceRangeMax: integer("price_range_max"),
  requiresPrescription: boolean("requires_prescription").default(false),
  controlled: boolean("controlled").default(false),
  atcCode: text("atc_code"),
  icdIndications: text("icd_indications"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const symptomTaxonomy = pgTable("symptom_taxonomy", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").unique().notNull(),
  category: text("category").notNull(),
  prevalence: integer("prevalence"), // weight for AfriDx
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const drugQueryLogs = pgTable("drug_query_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  drugId: uuid("drug_id").references(() => drugs.id, { onDelete: "set null" }),
  query: text("query").notNull(),
  queryType: text("query_type").notNull(), // search, detail, interaction, explanation
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Pharmacies ──────────────────────────────────────────────────────────────
export const pharmacies = pgTable("pharmacies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  state: text("state").notNull(),
  lga: text("lga"),
  phone: text("phone"),
  email: text("email"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  osmId: text("osm_id").unique(),
  osmType: text("osm_type"), // 'node' | 'way' | 'relation'
  openingHours: text("opening_hours"),
  website: text("website"),
  isVerified: boolean("is_verified").default(false),
  isClosed: boolean("is_closed").default(false),
  trustScore: integer("trust_score").default(50),
  reportCount: integer("report_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Drug Availability Reports ────────────────────────────────────────────────
export const drugAvailabilityReports = pgTable("drug_availability_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  pharmacyId: uuid("pharmacy_id").notNull().references(() => pharmacies.id, { onDelete: "cascade" }),
  drugId: uuid("drug_id").references(() => drugs.id, { onDelete: "set null" }),
  drugName: text("drug_name").notNull(),
  isInStock: boolean("is_in_stock").notNull(),
  reportedBy: text("reported_by"), // user_id
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Drug Price Reports ───────────────────────────────────────────────────────
export const drugPriceReports = pgTable("drug_price_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  pharmacyId: uuid("pharmacy_id").notNull().references(() => pharmacies.id, { onDelete: "cascade" }),
  drugId: uuid("drug_id").references(() => drugs.id, { onDelete: "set null" }),
  drugName: text("drug_name").notNull(),
  price: integer("price").notNull(),
  quantity: text("quantity"),
  reportedBy: text("reported_by"), // user_id
  moderationStatus: text("moderation_status").default("pending").notNull(),
  flagReason: text("flag_reason"),
  moderatedBy: text("moderated_by"),
  moderationNote: text("moderation_note"),
  moderatedAt: timestamp("moderated_at"),
  isAutoFlagged: boolean("is_auto_flagged").default(false),
  autoFlagReason: text("auto_flag_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Labs ───────────────────────────────────────────────────────────────────
export const labs = pgTable("labs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  state: text("state").notNull(),
  lga: text("lga"),
  phone: text("phone"),
  email: text("email"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Moderation Audit Log ─────────────────────────────────────────────────────
export const moderationAuditLog = pgTable("moderation_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportId: uuid("report_id").notNull().references(() => drugPriceReports.id, { onDelete: "cascade" }),
  adminId: text("admin_id").notNull(),
  action: text("action").notNull(),
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Doctor Onboarding ───────────────────────────────────────────────────────
export const doctorProfiles = pgTable("doctor_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  gender: text("gender"),
  phone: text("phone"),
  mdcnNumber: text("mdcn_number").unique().notNull(),
  mdcnYear: integer("mdcn_year"),
  specialization: text("specialization").notNull(),
  subSpecialization: text("sub_specialization"),
  yearsExperience: integer("years_experience"),
  currentHospital: text("current_hospital"),
  hospitalState: text("hospital_state"),
  hospitalLga: text("hospital_lga"),
  isIndependent: boolean("is_independent").default(false).notNull(),
  bio: text("bio"),
  languages: text("languages").default('["English"]'), // JSON string array
  consultationTypes: text("consultation_types").default('["In-person"]'), // JSON string array
  verificationStatus: text("verification_status").default("pending").notNull(), // pending, under_review, approved, rejected, suspended
  isCopilotEnabled: boolean("is_copilot_enabled").default(false).notNull(),
  rejectionReason: text("rejection_reason"),
  verifiedBy: uuid("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  coverUrl: text("cover_url"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const doctorVerificationAudit = pgTable("doctor_verification_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").notNull().references(() => doctorProfiles.id, { onDelete: "cascade" }),
  adminId: uuid("admin_id").notNull().references(() => users.id),
  action: text("action").notNull(), // approve, reject, suspend, reinstate, under_review, note, submit
  previousStatus: text("previous_status"),
  newStatus:      text("new_status"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Clinic Invitations & Audit ─────────────────────────────────────────────
export const clinicInvitations = pgTable("clinic_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull(), 
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  status: text("status").default("pending").notNull(), // pending, accepted, expired, revoked
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clinicVerificationAudit = pgTable("clinic_verification_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  adminId: uuid("admin_id").notNull().references(() => users.id),
  action: text("action").notNull(), // approve, reject, note, submit
  previousStatus: text("previous_status"),
  newStatus:      text("new_status"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clinicalCases = pgTable("clinical_cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id").references(() => users.id, { onDelete: "set null" }), // Optional link to a registered patient
  patientName: text("patient_name").notNull(),
  patientAge: text("patient_age").notNull(),
  patientSex: text("patient_sex").notNull(),
  chiefComplaint: text("chief_complaint").notNull(),
  vitals: text("vitals"), // JSON string
  analysis: text("analysis").notNull(), // AI JSON response
  soapNote: text("soap_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const copilotAuditLogs = pgTable("copilot_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // analyze, generate-soap
  promptVersion: text("prompt_version").notNull(),
  input: text("input").notNull(), // JSON string
  output: text("output"), // JSON string (null if failed)
  status: text("status").notNull(), // success, failure
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // info, success, warning, error
  link: text("link"), // Optional URL to navigate to
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const referrals = pgTable("referrals", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").references(() => users.id, { onDelete: "set null" }),
  patientName: text("patient_name").notNull(),
  patientAge: text("patient_age").notNull(),
  patientSex: text("patient_sex").notNull(),
  sendingDoctorId: uuid("sending_doctor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receivingDoctorId: uuid("receiving_doctor_id").references(() => users.id, { onDelete: "set null" }),
  receivingFacility: text("receiving_facility"),
  specialty: text("specialty").notNull(),
  priority: text("priority").notNull().default("Routine"), // Routine, Urgent, Stat
  urgencyScore: integer("urgency_score").notNull().default(1), // 1-5
  notes: text("notes"),
  clinicalSummary: text("clinical_summary").notNull(), // JSON string
  status: text("status").notNull().default("pending"), // pending, accepted, rejected, completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const consultationRequests = pgTable("consultation_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // pending, accepted, declined, completed
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const patientDoctorConsent = pgTable("patient_doctor_consent", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"), // active, revoked
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const clinicPatients = pgTable("clinic_patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const patientClinicConsent = pgTable("patient_clinic_consent", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"), // active, revoked
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: appointmentStatusEnum("status").default("pending").notNull(),
  type: text("type").default("consultation").notNull(), // consultation, follow_up, emergency
  reason: text("reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const doctorAvailability = pgTable("doctor_availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (Sunday-Saturday)
  startTime: text("start_time").notNull(), // HH:mm
  endTime: text("end_time").notNull(), // HH:mm
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── EMR / Clinical Records ──────────────────────────────────────────────────

export const encounterStatusEnum = pgEnum("encounter_status", ["draft", "signed"]);

export const labStatusEnum = pgEnum("lab_status", [
  "ordered",
  "pending",
  "samples_collected",
  "processing",
  "completed",
  "cancelled",
]);

export const encounters = pgTable("encounters", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
  patientId: uuid("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  
  chiefComplaint: text("chief_complaint").notNull(),
  historyOfPresentIllness: text("history_of_present_illness"),
  examinationFindings: text("examination_findings"),
  diagnosis: text("diagnosis"), // JSON string or text summary
  icd11Codes: text("icd11_codes"), // Comma-separated or JSON
  plan: text("plan"),
  soapNote: text("soap_note"), // For AI generated summaries
  
  status: encounterStatusEnum("status").default("draft").notNull(),
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const prescriptions = pgTable("prescriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  encounterId: uuid("encounter_id").references(() => encounters.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  
  status: text("status").default("active").notNull(), // active, discontinued, completed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const prescriptionItems = pgTable("prescription_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  prescriptionId: uuid("prescription_id").notNull().references(() => prescriptions.id, { onDelete: "cascade" }),
  drugId: uuid("drug_id").references(() => drugs.id, { onDelete: "set null" }),
  drugName: text("drug_name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  duration: text("duration").notNull(),
  instructions: text("instructions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const billingStatus = pgEnum("billing_status", ["pending", "partial", "paid", "void"]);
export const paymentMethod = pgEnum("payment_method", ["cash", "bank_transfer", "card", "other"]);

export const labOrders = pgTable("lab_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  encounterId: uuid("encounter_id").references(() => encounters.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  testNames: text("test_names").notNull(), // Comma separated or JSON
  results: text("results"),
  attachmentUrl: text("attachment_url"),
  status: labStatusEnum("status").default("ordered").notNull(),
  orderedAt: timestamp("ordered_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  encounterId: uuid("encounter_id").references(() => encounters.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(), // e.g., INV-2024-001
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).default("0.00"),
  dueAmount: decimal("due_amount", { precision: 12, scale: 2 }).notNull(),
  status: billingStatus("status").default("pending"),
  dueDate: timestamp("due_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").references(() => invoices.id).notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).default("1.00"),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").references(() => invoices.id).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  method: paymentMethod("method").notNull(),
  reference: text("reference"), // Transaction ID, receipt number, etc.
  notes: text("notes"),
  paidAt: timestamp("paid_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Insurance & NHIS ────────────────────────────────────────────────────────

export const claimStatus = pgEnum("claim_status", ["draft", "submitted", "processing", "approved", "rejected", "paid"]);

export const insuranceProviders = pgTable("insurance_providers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(), // e.g., NHIS, Reliance HMO, Hygeia
  code: text("code").unique(), // Provider code for electronic claims
  type: text("type").notNull(), // public, private
  contactEmail: text("contact_email"),
  portalUrl: text("portal_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const patientInsurance = pgTable("patient_insurance", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  providerId: uuid("provider_id").notNull().references(() => insuranceProviders.id),
  policyNumber: text("policy_number").notNull(),
  planType: text("plan_type"), // e.g., Gold, NHIS Standard
  status: text("status").default("active").notNull(), // active, expired, suspended
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insuranceClaims = pgTable("insurance_claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  encounterId: uuid("encounter_id").references(() => encounters.id, { onDelete: "set null" }),
  claimNumber: text("claim_number").notNull(), // e.g., CLM-2024-001
  status: claimStatus("status").default("draft").notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  approvedAmount: decimal("approved_amount", { precision: 12, scale: 2 }),
  rejectionReason: text("rejection_reason"),
  submittedAt: timestamp("submitted_at"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
