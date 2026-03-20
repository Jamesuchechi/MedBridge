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
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dob: date("dob"),
  gender: text("gender"),
  bloodGroup: text("blood_group"),
  genotype: text("genotype"),
  allergies: text("allergies"),
  chronicConditions: text("chronic_conditions"),
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
  manufacturer: text("manufacturer"),
  category: text("category").notNull(),
  form: text("form"), // tablet, syrup, etc.
  strength: text("strength"),
  priceRange: text("price_range"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const symptomTaxonomy = pgTable("symptom_taxonomy", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").unique().notNull(),
  category: text("category").notNull(),
  prevalence: integer("prevalence"), // weight for AfriDx
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
