"use strict";
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
const path_1 = __importDefault(require("path"));
dotenv.config({ path: path_1.default.join(__dirname, "../../../../.env") });
const fs_1 = __importDefault(require("fs"));
const sync_1 = require("csv-parse/sync");
const XLSX = __importStar(require("xlsx"));
const db_1 = require("@medbridge/db");
const SEED_DIR = path_1.default.join(__dirname, "../../../../packages/db/seed");
async function importNigerianCSV() {
    const csvPath = path_1.default.join(SEED_DIR, "medbridge_drugs.csv");
    if (!fs_1.default.existsSync(csvPath))
        return;
    console.log("🇳🇬 Importing Nigerian Context (medbridge_drugs.csv)...");
    const records = (0, sync_1.parse)(fs_1.default.readFileSync(csvPath, "utf-8"), { columns: true, skip_empty_lines: true });
    const transformPipe = (val) => JSON.stringify(val ? val.split("|").map(s => s.trim()) : []);
    for (const r of records) {
        try {
            if (!r.drug_name && !r.generic_name)
                continue;
            await db_1.db.insert(db_1.drugs).values({
                name: r.drug_name || r.generic_name || "UNKNOWN",
                genericName: r.generic_name || r.drug_name || "UNKNOWN",
                nafdacNumber: r.nafdac_number,
                manufacturer: r.manufacturer,
                category: r.category || "General Medicine",
                form: r.form,
                strength: r.strength,
                brandNames: transformPipe(r.brand_names),
                uses: transformPipe(r.uses),
                contraindications: transformPipe(r.contraindications),
                sideEffects: transformPipe(r.side_effects),
                interactions: transformPipe(r.interactions),
                priceRangeMin: r.price_min ? parseInt(r.price_min) : null,
                priceRangeMax: r.price_max ? parseInt(r.price_max) : null,
                requiresPrescription: r.requires_prescription === "True",
            }).onConflictDoNothing();
        }
        catch (e) {
            console.warn(`Failed to import drug ${r.drug_name}:`, e instanceof Error ? e.message : String(e));
        }
    }
}
async function importFDAJson() {
    const jsonPath = path_1.default.join(SEED_DIR, "drug-drugs-data.json");
    if (!fs_1.default.existsSync(jsonPath))
        return;
    console.log("🌎 Importing FDA Global Dataset (drug-drugs-data.json) with batching...");
    const data = JSON.parse(fs_1.default.readFileSync(jsonPath, "utf-8"));
    let batch = [];
    let count = 0;
    for (const r of data.results) {
        const mainProd = r.products?.[0];
        if (!mainProd)
            continue;
        batch.push({
            name: mainProd.brand_name || mainProd.active_ingredients?.[0]?.name || "UNKNOWN",
            genericName: mainProd.active_ingredients?.[0]?.name || mainProd.brand_name || "UNKNOWN",
            manufacturer: r.sponsor_name,
            form: mainProd.dosage_form,
            strength: mainProd.active_ingredients?.[0]?.strength,
            requiresPrescription: mainProd.marketing_status === "Prescription",
            category: "General Medicine",
        });
        if (batch.length >= 100) {
            try {
                await db_1.db.insert(db_1.drugs).values(batch).onConflictDoNothing();
                count += batch.length;
                if (count % 1000 === 0)
                    console.log(`FDA progress: ${count}...`);
            }
            catch (err) {
                console.warn("Batch insert failed:", err instanceof Error ? err.message : String(err));
            }
            batch = [];
        }
    }
    // Remaining
    if (batch.length > 0) {
        await db_1.db.insert(db_1.drugs).values(batch).onConflictDoNothing();
        count += batch.length;
    }
    console.log(`✅ FDA Import Done: ${count} records.`);
}
async function importCleanedXLS() {
    const xlsPath = path_1.default.join(SEED_DIR, "drugs_cleaned_dataset.xls");
    if (!fs_1.default.existsSync(xlsPath))
        return;
    console.log("🧹 Importing Cleaned Dataset (drugs_cleaned_dataset.xls)...");
    const workbook = XLSX.readFile(xlsPath);
    const sheetName = workbook.SheetNames[0];
    const records = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    let count = 0;
    for (const r of records) {
        try {
            if (!r.drug_name && !r.name)
                continue;
            await db_1.db.insert(db_1.drugs).values({
                name: r.drug_name || r.name || "UNKNOWN",
                genericName: r.generic_name || r.generic || "UNKNOWN",
                category: r.category || "General",
                manufacturer: r.manufacturer || r.sponsor,
                form: r.dosage_form || r.form,
            }).onConflictDoNothing();
            count++;
        }
        catch (err) {
            console.warn("Failed to import XLS record:", err instanceof Error ? err.message : String(err));
        }
    }
    console.log(`✅ XLS Import Done: ${count} records.`);
}
async function main() {
    await importNigerianCSV();
    await importCleanedXLS();
    await importFDAJson();
    console.log("🎉 ALL DATASETS PROCESSED SUCCESSFULLY!");
    process.exit(0);
}
main().catch(err => { console.error("Import failed:", err); process.exit(1); });
