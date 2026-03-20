"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.symptomTaxonomy = exports.drugs = exports.medicalDocuments = exports.symptomChecks = exports.healthProfiles = exports.clinics = exports.users = exports.roleEnum = void 0;
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
    clinicId: (0, pg_core_1.uuid)("clinic_id"),
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
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    dob: (0, pg_core_1.date)("dob"),
    gender: (0, pg_core_1.text)("gender"),
    bloodGroup: (0, pg_core_1.text)("blood_group"),
    genotype: (0, pg_core_1.text)("genotype"),
    allergies: (0, pg_core_1.text)("allergies"),
    chronicConditions: (0, pg_core_1.text)("chronic_conditions"),
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
    manufacturer: (0, pg_core_1.text)("manufacturer"),
    category: (0, pg_core_1.text)("category").notNull(),
    form: (0, pg_core_1.text)("form"), // tablet, syrup, etc.
    strength: (0, pg_core_1.text)("strength"),
    priceRange: (0, pg_core_1.text)("price_range"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.symptomTaxonomy = (0, pg_core_1.pgTable)("symptom_taxonomy", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)("name").unique().notNull(),
    category: (0, pg_core_1.text)("category").notNull(),
    prevalence: (0, pg_core_1.integer)("prevalence"), // weight for AfriDx
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
