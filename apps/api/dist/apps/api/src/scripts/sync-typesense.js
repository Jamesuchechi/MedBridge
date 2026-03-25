"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.join(__dirname, "../../../../.env") });
const typesense_1 = __importDefault(require("typesense"));
const db_1 = require("@medbridge/db");
const COLLECTION_NAME = "drugs";
// ─── Typesense client ─────────────────────────────────────────────────────────
const client = new typesense_1.default.Client({
    nodes: [
        {
            host: process.env.TYPESENSE_HOST || "localhost",
            port: parseInt(process.env.TYPESENSE_PORT || "8108"),
            protocol: process.env.TYPESENSE_PROTOCOL || "http",
        },
    ],
    apiKey: process.env.TYPESENSE_ADMIN_KEY || "medbridge_dev_typesense_key_change_in_prod",
    connectionTimeoutSeconds: 10,
});
// ─── Collection schema ────────────────────────────────────────────────────────
const DRUG_SCHEMA = {
    name: COLLECTION_NAME,
    fields: [
        { name: "id", type: "string" },
        { name: "name", type: "string" },
        { name: "genericName", type: "string" },
        { name: "nafdacNumber", type: "string", optional: true },
        { name: "manufacturer", type: "string", optional: true },
        { name: "category", type: "string", facet: true },
        { name: "form", type: "string", optional: true, facet: true },
        { name: "strength", type: "string", optional: true },
        { name: "brandNames", type: "string[]", optional: true },
        { name: "uses", type: "string[]", optional: true },
        { name: "contraindications", type: "string[]", optional: true },
        { name: "sideEffects", type: "string[]", optional: true },
        { name: "interactions", type: "string[]", optional: true },
        { name: "priceRangeMin", type: "int32", optional: true, facet: true },
        { name: "priceRangeMax", type: "int32", optional: true },
        { name: "requiresPrescription", type: "bool", facet: true },
        { name: "controlled", type: "bool", facet: true },
        { name: "atcCode", type: "string", optional: true },
    ],
};
// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseJsonArray(val) {
    if (!val)
        return [];
    try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed.map(String) : [];
    }
    catch {
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
    }
    catch {
        console.log("ℹ️  No existing collection to delete");
    }
    // 2. Create collection with schema
    await client.collections().create(DRUG_SCHEMA);
    console.log("✅ Created collection:", COLLECTION_NAME);
    // 3. Fetch all drugs from Postgres
    console.log("📦 Fetching drugs from Postgres...");
    const allDrugs = await db_1.db.select().from(db_1.drugs);
    console.log(`   Found ${allDrugs.length} drugs`);
    if (allDrugs.length === 0) {
        console.log("⚠️  No drugs found in Postgres. Run the seed/import first.");
        process.exit(0);
    }
    // 4. Transform and batch-import
    const documents = allDrugs.map((drug) => ({
        id: drug.id,
        name: drug.name,
        genericName: drug.genericName,
        nafdacNumber: drug.nafdacNumber || "",
        manufacturer: drug.manufacturer || "",
        category: drug.category,
        form: drug.form || "",
        strength: drug.strength || "",
        brandNames: parseJsonArray(drug.brandNames),
        uses: parseJsonArray(drug.uses),
        contraindications: parseJsonArray(drug.contraindications),
        sideEffects: parseJsonArray(drug.sideEffects),
        interactions: parseJsonArray(drug.interactions),
        priceRangeMin: drug.priceRangeMin ?? 0,
        priceRangeMax: drug.priceRangeMax ?? 0,
        requiresPrescription: drug.requiresPrescription ?? false,
        controlled: drug.controlled ?? false,
        atcCode: drug.atcCode || "",
    }));
    const BATCH_SIZE = 100;
    let imported = 0;
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
        const batch = documents.slice(i, i + BATCH_SIZE);
        const result = await client
            .collections(COLLECTION_NAME)
            .documents()
            .import(batch, { action: "upsert" });
        const failures = result.filter((r) => !r.success);
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
