/**
 * Typesense Sync Script
 * =====================
 * Creates the drugs collection schema in Typesense and syncs all drugs from Postgres.
 *
 * Run:
 *   pnpm --filter api ts-node src/scripts/sync-typesense.ts
 *
 * Or add to package.json scripts:
 *   "sync:typesense": "ts-node src/scripts/sync-typesense.ts"
 *
 * This should be run:
 *   1. First time setup
 *   2. After bulk drug imports
 *   3. As a scheduled job (e.g. nightly) if NAFDAC data is regularly updated
 */

import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(__dirname, "../../../../.env") });

import Typesense from "typesense";
import { db, drugs } from "@medbridge/db";

const COLLECTION_NAME = "drugs";

// ─── Typesense client ─────────────────────────────────────────────────────────
const client = new Typesense.Client({
  nodes: [
    {
      host:     process.env.TYPESENSE_HOST     || "localhost",
      port:     parseInt(process.env.TYPESENSE_PORT || "8108"),
      protocol: process.env.TYPESENSE_PROTOCOL || "http",
    },
  ],
  apiKey:         process.env.TYPESENSE_ADMIN_KEY || "medbridge_dev_typesense_key_change_in_prod",
  connectionTimeoutSeconds: 10,
});

// ─── Collection schema ────────────────────────────────────────────────────────
const DRUG_SCHEMA = {
  name: COLLECTION_NAME,
  fields: [
    { name: "id",                   type: "string" as const },
    { name: "name",                 type: "string" as const },
    { name: "genericName",          type: "string" as const },
    { name: "nafdacNumber",         type: "string" as const, optional: true },
    { name: "manufacturer",         type: "string" as const, optional: true },
    { name: "category",             type: "string" as const, facet: true },
    { name: "form",                 type: "string" as const, optional: true, facet: true },
    { name: "strength",             type: "string" as const, optional: true },
    { name: "brandNames",           type: "string[]" as const, optional: true },
    { name: "uses",                 type: "string[]" as const, optional: true },
    { name: "contraindications",    type: "string[]" as const, optional: true },
    { name: "sideEffects",          type: "string[]" as const, optional: true },
    { name: "interactions",         type: "string[]" as const, optional: true },
    { name: "priceRangeMin",        type: "int32"  as const,  optional: true, facet: true },
    { name: "priceRangeMax",        type: "int32"  as const,  optional: true },
    { name: "requiresPrescription", type: "bool"   as const,  facet: true },
    { name: "controlled",           type: "bool"   as const,  facet: true },
    { name: "atcCode",              type: "string" as const,  optional: true },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔍 Connecting to Typesense...");

  // 1. Delete existing collection if present (for full re-sync)
  try {
    await client.collections(COLLECTION_NAME).delete();
    console.log("🗑  Deleted existing collection");
  } catch {
    console.log("ℹ️  No existing collection to delete");
  }

  // 2. Create collection with schema
  await client.collections().create(DRUG_SCHEMA);
  console.log("✅ Created collection:", COLLECTION_NAME);

  // 3. Fetch all drugs from Postgres
  console.log("📦 Fetching drugs from Postgres...");
  const allDrugs = await db.select().from(drugs);
  console.log(`   Found ${allDrugs.length} drugs`);

  if (allDrugs.length === 0) {
    console.log("⚠️  No drugs found in Postgres. Run the seed/import first.");
    process.exit(0);
  }

  // 4. Transform and batch-import
  const documents = allDrugs.map((drug) => ({
    id:                   drug.id,
    name:                 drug.name,
    genericName:          drug.genericName,
    nafdacNumber:         drug.nafdacNumber || "",
    manufacturer:         drug.manufacturer || "",
    category:             drug.category,
    form:                 drug.form || "",
    strength:             drug.strength || "",
    brandNames:           parseJsonArray(drug.brandNames),
    uses:                 parseJsonArray(drug.uses),
    contraindications:    parseJsonArray(drug.contraindications),
    sideEffects:          parseJsonArray(drug.sideEffects),
    interactions:         parseJsonArray(drug.interactions),
    priceRangeMin:        drug.priceRangeMin ?? 0,
    priceRangeMax:        drug.priceRangeMax ?? 0,
    requiresPrescription: drug.requiresPrescription ?? false,
    controlled:           drug.controlled ?? false,
    atcCode:              drug.atcCode || "",
  }));

  const BATCH_SIZE = 100;
  let imported = 0;

  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    const result = await client
      .collections(COLLECTION_NAME)
      .documents()
      .import(batch, { action: "upsert" });

    const failures = result.filter((r: { success: boolean }) => !r.success);
    if (failures.length > 0) {
      console.warn(`⚠️  ${failures.length} failures in batch ${i / BATCH_SIZE + 1}:`, failures.slice(0, 3));
    }
    imported += batch.length - failures.length;
    process.stdout.write(`\r   Imported ${imported}/${documents.length}`);
  }

  console.log(`\n✅ Sync complete. ${imported} drugs in Typesense.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Sync failed:", err.message || err);
  process.exit(1);
});