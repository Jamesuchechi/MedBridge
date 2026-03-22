import { pgTable, text, timestamp, boolean, uuid, pgEnum, date, integer } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", [
  "PATIENT",
  "CLINICIAN",
  "CLINIC_STAFF",
  "CLINIC_ADMIN",
  "SUPER_ADMIN",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  name: text("name"),
  role: roleEnum("role").default("PATIENT").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  clinicId: uuid("clinic_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clinics = pgTable("clinics", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
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
