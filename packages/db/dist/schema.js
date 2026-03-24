"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patientDoctorConsent = exports.consultationRequests = exports.referrals = exports.notifications = exports.copilotAuditLogs = exports.clinicalCases = exports.doctorVerificationAudit = exports.doctorProfiles = exports.moderationAuditLog = exports.drugPriceReports = exports.drugAvailabilityReports = exports.pharmacies = exports.drugQueryLogs = exports.symptomTaxonomy = exports.drugs = exports.medicalDocuments = exports.symptomChecks = exports.healthProfiles = exports.clinics = exports.users = exports.roleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.roleEnum = (0, pg_core_1.pgEnum)("role", [
    "PATIENT",
    "CLINICIAN",
    "CLINIC_STAFF",
    "CLINIC_ADMIN",
    "SUPER_ADMIN",
]);
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    email: (0, pg_core_1.text)("email").unique().notNull(),
    name: (0, pg_core_1.text)("name"),
    role: (0, exports.roleEnum)("role").default("PATIENT").notNull(),
    isVerified: (0, pg_core_1.boolean)("is_verified").default(false).notNull(),
    mdcnVerified: (0, pg_core_1.boolean)("mdcn_verified").default(false),
    clinicId: (0, pg_core_1.uuid)("clinic_id"),
    avatarUrl: (0, pg_core_1.text)("avatar_url"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.clinics = (0, pg_core_1.pgTable)("clinics", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)("name").notNull(),
    address: (0, pg_core_1.text)("address"),
    phone: (0, pg_core_1.text)("phone"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.healthProfiles = (0, pg_core_1.pgTable)("health_profiles", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull().unique().references(() => exports.users.id, { onDelete: "cascade" }),
    dob: (0, pg_core_1.date)("dob"),
    gender: (0, pg_core_1.text)("gender"),
    phone: (0, pg_core_1.text)("phone"),
    state: (0, pg_core_1.text)("state"),
    lga: (0, pg_core_1.text)("lga"),
    bloodGroup: (0, pg_core_1.text)("blood_group"),
    genotype: (0, pg_core_1.text)("genotype"),
    weight: (0, pg_core_1.text)("weight"),
    height: (0, pg_core_1.text)("height"),
    chronicConditions: (0, pg_core_1.text)("chronic_conditions"), // JSON string array
    allergies: (0, pg_core_1.text)("allergies"), // JSON string array of objects
    medications: (0, pg_core_1.text)("medications"), // JSON string array of objects
    familyHistory: (0, pg_core_1.text)("family_history"), // JSON string array
    vaccinations: (0, pg_core_1.text)("vaccinations"), // JSON string array
    medicalHistory: (0, pg_core_1.text)("medical_history"), // JSON string array (surgeries, hospitalizations)
    emergencyName: (0, pg_core_1.text)("emergency_name"),
    emergencyPhone: (0, pg_core_1.text)("emergency_phone"),
    emergencyRelation: (0, pg_core_1.text)("emergency_relation"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.symptomChecks = (0, pg_core_1.pgTable)("symptom_checks", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    symptoms: (0, pg_core_1.text)("symptoms").notNull(), // JSON string or comma-separated
    analysis: (0, pg_core_1.text)("analysis").notNull(), // AI JSON response
    urgency: (0, pg_core_1.text)("urgency").notNull(), // green / amber / red
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.medicalDocuments = (0, pg_core_1.pgTable)("medical_documents", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    type: (0, pg_core_1.text)("type").notNull(), // lab_result, prescription, etc.
    fileUrl: (0, pg_core_1.text)("file_url").notNull(),
    extraction: (0, pg_core_1.text)("extraction"), // AI JSON extraction
    status: (0, pg_core_1.text)("status").default("pending").notNull(), // pending, processing, complete, failed
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.drugs = (0, pg_core_1.pgTable)("drugs", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)("name").notNull(),
    genericName: (0, pg_core_1.text)("generic_name").notNull(),
    nafdacNumber: (0, pg_core_1.text)("nafdac_number").unique(),
    manufacturer: (0, pg_core_1.text)("manufacturer"),
    category: (0, pg_core_1.text)("category").notNull(),
    form: (0, pg_core_1.text)("form"), // tablet, syrup, etc.
    strength: (0, pg_core_1.text)("strength"),
    brandNames: (0, pg_core_1.text)("brand_names"),
    uses: (0, pg_core_1.text)("uses"),
    contraindications: (0, pg_core_1.text)("contraindications"),
    sideEffects: (0, pg_core_1.text)("side_effects"),
    interactions: (0, pg_core_1.text)("interactions"),
    priceRangeMin: (0, pg_core_1.integer)("price_range_min"),
    priceRangeMax: (0, pg_core_1.integer)("price_range_max"),
    requiresPrescription: (0, pg_core_1.boolean)("requires_prescription").default(false),
    controlled: (0, pg_core_1.boolean)("controlled").default(false),
    atcCode: (0, pg_core_1.text)("atc_code"),
    icdIndications: (0, pg_core_1.text)("icd_indications"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.symptomTaxonomy = (0, pg_core_1.pgTable)("symptom_taxonomy", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)("name").unique().notNull(),
    category: (0, pg_core_1.text)("category").notNull(),
    prevalence: (0, pg_core_1.integer)("prevalence"), // weight for AfriDx
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.drugQueryLogs = (0, pg_core_1.pgTable)("drug_query_logs", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    drugId: (0, pg_core_1.uuid)("drug_id").references(() => exports.drugs.id, { onDelete: "set null" }),
    query: (0, pg_core_1.text)("query").notNull(),
    queryType: (0, pg_core_1.text)("query_type").notNull(), // search, detail, interaction, explanation
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// ─── Pharmacies ──────────────────────────────────────────────────────────────
exports.pharmacies = (0, pg_core_1.pgTable)("pharmacies", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)("name").notNull(),
    address: (0, pg_core_1.text)("address").notNull(),
    state: (0, pg_core_1.text)("state").notNull(),
    lga: (0, pg_core_1.text)("lga"),
    phone: (0, pg_core_1.text)("phone"),
    email: (0, pg_core_1.text)("email"),
    lat: (0, pg_core_1.doublePrecision)("lat"),
    lng: (0, pg_core_1.doublePrecision)("lng"),
    osmId: (0, pg_core_1.text)("osm_id").unique(),
    osmType: (0, pg_core_1.text)("osm_type"), // 'node' | 'way' | 'relation'
    openingHours: (0, pg_core_1.text)("opening_hours"),
    website: (0, pg_core_1.text)("website"),
    isVerified: (0, pg_core_1.boolean)("is_verified").default(false),
    isClosed: (0, pg_core_1.boolean)("is_closed").default(false),
    trustScore: (0, pg_core_1.integer)("trust_score").default(50),
    reportCount: (0, pg_core_1.integer)("report_count").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// ─── Drug Availability Reports ────────────────────────────────────────────────
exports.drugAvailabilityReports = (0, pg_core_1.pgTable)("drug_availability_reports", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    pharmacyId: (0, pg_core_1.uuid)("pharmacy_id").notNull().references(() => exports.pharmacies.id, { onDelete: "cascade" }),
    drugId: (0, pg_core_1.uuid)("drug_id").references(() => exports.drugs.id, { onDelete: "set null" }),
    drugName: (0, pg_core_1.text)("drug_name").notNull(),
    isInStock: (0, pg_core_1.boolean)("is_in_stock").notNull(),
    reportedBy: (0, pg_core_1.text)("reported_by"), // user_id
    expiresAt: (0, pg_core_1.timestamp)("expires_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// ─── Drug Price Reports ───────────────────────────────────────────────────────
exports.drugPriceReports = (0, pg_core_1.pgTable)("drug_price_reports", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    pharmacyId: (0, pg_core_1.uuid)("pharmacy_id").notNull().references(() => exports.pharmacies.id, { onDelete: "cascade" }),
    drugId: (0, pg_core_1.uuid)("drug_id").references(() => exports.drugs.id, { onDelete: "set null" }),
    drugName: (0, pg_core_1.text)("drug_name").notNull(),
    price: (0, pg_core_1.integer)("price").notNull(),
    quantity: (0, pg_core_1.text)("quantity"),
    reportedBy: (0, pg_core_1.text)("reported_by"), // user_id
    moderationStatus: (0, pg_core_1.text)("moderation_status").default("pending").notNull(),
    flagReason: (0, pg_core_1.text)("flag_reason"),
    moderatedBy: (0, pg_core_1.text)("moderated_by"),
    moderationNote: (0, pg_core_1.text)("moderation_note"),
    moderatedAt: (0, pg_core_1.timestamp)("moderated_at"),
    isAutoFlagged: (0, pg_core_1.boolean)("is_auto_flagged").default(false),
    autoFlagReason: (0, pg_core_1.text)("auto_flag_reason"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// ─── Moderation Audit Log ─────────────────────────────────────────────────────
exports.moderationAuditLog = (0, pg_core_1.pgTable)("moderation_audit_log", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    reportId: (0, pg_core_1.uuid)("report_id").notNull().references(() => exports.drugPriceReports.id, { onDelete: "cascade" }),
    adminId: (0, pg_core_1.text)("admin_id").notNull(),
    action: (0, pg_core_1.text)("action").notNull(),
    previousStatus: (0, pg_core_1.text)("previous_status"),
    newStatus: (0, pg_core_1.text)("new_status"),
    note: (0, pg_core_1.text)("note"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// ─── Doctor Onboarding ───────────────────────────────────────────────────────
exports.doctorProfiles = (0, pg_core_1.pgTable)("doctor_profiles", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull().unique().references(() => exports.users.id, { onDelete: "cascade" }),
    fullName: (0, pg_core_1.text)("full_name").notNull(),
    gender: (0, pg_core_1.text)("gender"),
    phone: (0, pg_core_1.text)("phone"),
    mdcnNumber: (0, pg_core_1.text)("mdcn_number").unique().notNull(),
    mdcnYear: (0, pg_core_1.integer)("mdcn_year"),
    specialization: (0, pg_core_1.text)("specialization").notNull(),
    subSpecialization: (0, pg_core_1.text)("sub_specialization"),
    yearsExperience: (0, pg_core_1.integer)("years_experience"),
    currentHospital: (0, pg_core_1.text)("current_hospital"),
    hospitalState: (0, pg_core_1.text)("hospital_state"),
    hospitalLga: (0, pg_core_1.text)("hospital_lga"),
    isIndependent: (0, pg_core_1.boolean)("is_independent").default(false).notNull(),
    bio: (0, pg_core_1.text)("bio"),
    languages: (0, pg_core_1.text)("languages").default('["English"]'), // JSON string array
    consultationTypes: (0, pg_core_1.text)("consultation_types").default('["In-person"]'), // JSON string array
    verificationStatus: (0, pg_core_1.text)("verification_status").default("pending").notNull(), // pending, under_review, approved, rejected, suspended
    isCopilotEnabled: (0, pg_core_1.boolean)("is_copilot_enabled").default(false).notNull(),
    rejectionReason: (0, pg_core_1.text)("rejection_reason"),
    verifiedBy: (0, pg_core_1.uuid)("verified_by").references(() => exports.users.id),
    verifiedAt: (0, pg_core_1.timestamp)("verified_at"),
    submittedAt: (0, pg_core_1.timestamp)("submitted_at").defaultNow().notNull(),
    coverUrl: (0, pg_core_1.text)("cover_url"),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.doctorVerificationAudit = (0, pg_core_1.pgTable)("doctor_verification_audit", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    doctorId: (0, pg_core_1.uuid)("doctor_id").notNull().references(() => exports.doctorProfiles.id, { onDelete: "cascade" }),
    adminId: (0, pg_core_1.uuid)("admin_id").notNull().references(() => exports.users.id),
    action: (0, pg_core_1.text)("action").notNull(), // approve, reject, suspend, reinstate, under_review, note, submit
    previousStatus: (0, pg_core_1.text)("previous_status"),
    newStatus: (0, pg_core_1.text)("new_status"),
    note: (0, pg_core_1.text)("note"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.clinicalCases = (0, pg_core_1.pgTable)("clinical_cases", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    doctorId: (0, pg_core_1.uuid)("doctor_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    patientId: (0, pg_core_1.uuid)("patient_id").references(() => exports.users.id, { onDelete: "set null" }), // Optional link to a registered patient
    patientName: (0, pg_core_1.text)("patient_name").notNull(),
    patientAge: (0, pg_core_1.text)("patient_age").notNull(),
    patientSex: (0, pg_core_1.text)("patient_sex").notNull(),
    chiefComplaint: (0, pg_core_1.text)("chief_complaint").notNull(),
    vitals: (0, pg_core_1.text)("vitals"), // JSON string
    analysis: (0, pg_core_1.text)("analysis").notNull(), // AI JSON response
    soapNote: (0, pg_core_1.text)("soap_note"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.copilotAuditLogs = (0, pg_core_1.pgTable)("copilot_audit_logs", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    doctorId: (0, pg_core_1.uuid)("doctor_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    action: (0, pg_core_1.text)("action").notNull(), // analyze, generate-soap
    promptVersion: (0, pg_core_1.text)("prompt_version").notNull(),
    input: (0, pg_core_1.text)("input").notNull(), // JSON string
    output: (0, pg_core_1.text)("output"), // JSON string (null if failed)
    status: (0, pg_core_1.text)("status").notNull(), // success, failure
    errorMessage: (0, pg_core_1.text)("error_message"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.notifications = (0, pg_core_1.pgTable)("notifications", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    title: (0, pg_core_1.text)("title").notNull(),
    message: (0, pg_core_1.text)("message").notNull(),
    type: (0, pg_core_1.text)("type").notNull().default("info"), // info, success, warning, error
    link: (0, pg_core_1.text)("link"), // Optional URL to navigate to
    isRead: (0, pg_core_1.boolean)("is_read").notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.referrals = (0, pg_core_1.pgTable)("referrals", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    patientId: (0, pg_core_1.uuid)("patient_id").references(() => exports.users.id, { onDelete: "set null" }),
    patientName: (0, pg_core_1.text)("patient_name").notNull(),
    patientAge: (0, pg_core_1.text)("patient_age").notNull(),
    patientSex: (0, pg_core_1.text)("patient_sex").notNull(),
    sendingDoctorId: (0, pg_core_1.uuid)("sending_doctor_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    receivingDoctorId: (0, pg_core_1.uuid)("receiving_doctor_id").references(() => exports.users.id, { onDelete: "set null" }),
    receivingFacility: (0, pg_core_1.text)("receiving_facility"),
    specialty: (0, pg_core_1.text)("specialty").notNull(),
    priority: (0, pg_core_1.text)("priority").notNull().default("Routine"), // Routine, Urgent, Stat
    urgencyScore: (0, pg_core_1.integer)("urgency_score").notNull().default(1), // 1-5
    notes: (0, pg_core_1.text)("notes"),
    clinicalSummary: (0, pg_core_1.text)("clinical_summary").notNull(), // JSON string
    status: (0, pg_core_1.text)("status").notNull().default("pending"), // pending, accepted, rejected, completed
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.consultationRequests = (0, pg_core_1.pgTable)("consultation_requests", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    patientId: (0, pg_core_1.uuid)("patient_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    doctorId: (0, pg_core_1.uuid)("doctor_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    status: (0, pg_core_1.text)("status").notNull().default("pending"), // pending, accepted, declined, completed
    message: (0, pg_core_1.text)("message"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.patientDoctorConsent = (0, pg_core_1.pgTable)("patient_doctor_consent", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    patientId: (0, pg_core_1.uuid)("patient_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    doctorId: (0, pg_core_1.uuid)("doctor_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    status: (0, pg_core_1.text)("status").notNull().default("active"), // active, revoked
    expiresAt: (0, pg_core_1.timestamp)("expires_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
