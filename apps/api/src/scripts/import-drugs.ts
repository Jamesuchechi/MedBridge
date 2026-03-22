import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "../../../../.env") });

import fs from "fs";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { db, drugs } from "@medbridge/db";
import { chain } from "stream-chain";
import { parser } from "stream-json";
import { pick } from "stream-json/filters/Pick";
import { streamArray } from "stream-json/streamers/StreamArray";

const SEED_DIR = path.join(__dirname, "../../../../packages/db/seed");
const LOCK_FILE = path.join(SEED_DIR, ".import.lock");

interface NigerianDrugRecord {
  drug_name?: string;
  generic_name?: string;
  nafdac_number?: string;
  manufacturer?: string;
  category?: string;
  form?: string;
  strength?: string;
  brand_names?: string;
  uses?: string;
  contraindications?: string;
  side_effects?: string;
  interactions?: string;
  price_min?: string;
  price_max?: string;
  requires_prescription?: string;
}

interface CleanedDrugRecord {
  drug_name?: string;
  name?: string;
  generic_name?: string;
  generic?: string;
  category?: string;
  manufacturer?: string;
  sponsor?: string;
  dosage_form?: string;
  form?: string;
}

async function importNigerianCSV() {
  const csvPath = path.join(SEED_DIR, "medbridge_drugs.csv");
  if (!fs.existsSync(csvPath)) return;
  console.log("🇳🇬 Importing Nigerian Context (medbridge_drugs.csv)...");
  const records = parse(fs.readFileSync(csvPath, "utf-8"), { columns: true, skip_empty_lines: true }) as NigerianDrugRecord[];
  const transformPipe = (val: string | undefined) => JSON.stringify(val ? val.split("|").map(s => s.trim()) : []);
  
  for (const r of records) {
    try {
      if (!r.drug_name && !r.generic_name) continue;
      await db.insert(drugs).values({
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
    } catch (e) {
      console.warn(`Failed to import drug ${r.drug_name}:`, e instanceof Error ? e.message : String(e));
    }
  }
}

async function importFDAJson() {
  const jsonPath = path.join(SEED_DIR, "drug-drugs-data.json");
  if (!fs.existsSync(jsonPath)) return;
  console.log("🌎 Importing FDA Global Dataset (drug-drugs-data.json) with streaming...");
  
  return new Promise<void>((resolve, reject) => {
    let batch: (typeof drugs.$inferInsert)[] = [];
    let count = 0;

    const pipeline = chain([
      fs.createReadStream(jsonPath),
      parser(),
      pick({ filter: "results" }),
      streamArray()
    ]);

    pipeline.on("data", async (data) => {
      const r = data.value;
      const mainProd = r.products?.[0];
      if (!mainProd) return;

      batch.push({
        name: mainProd.brand_name || mainProd.active_ingredients?.[0]?.name || "UNKNOWN",
        genericName: mainProd.active_ingredients?.[0]?.name || mainProd.brand_name || "UNKNOWN",
        manufacturer: r.sponsor_name,
        form: mainProd.dosage_form,
        strength: mainProd.active_ingredients?.[0]?.strength,
        requiresPrescription: mainProd.marketing_status === "Prescription",
        category: "General Medicine",
      });

      if (batch.length >= 200) {
        pipeline.pause();
        try {
          await db.insert(drugs).values(batch).onConflictDoNothing();
          count += batch.length;
          if (count % 1000 === 0) console.log(`FDA progress: ${count}...`);
        } catch (err) {
          console.warn("Batch insert failed:", err instanceof Error ? err.message : String(err));
        }
        batch = [];
        pipeline.resume();
      }
    });

    pipeline.on("end", async () => {
      if (batch.length > 0) {
        await db.insert(drugs).values(batch).onConflictDoNothing();
        count += batch.length;
      }
      console.log(`✅ FDA Import Done: ${count} records.`);
      resolve();
    });

    pipeline.on("error", (err) => {
      console.error("Pipeline error:", err);
      reject(err);
    });
  });
}

async function importCleanedXLS() {
  const xlsPath = path.join(SEED_DIR, "drugs_cleaned_dataset.xls");
  if (!fs.existsSync(xlsPath)) return;
  console.log("🧹 Importing Cleaned Dataset (drugs_cleaned_dataset.xls)...");
  const workbook = XLSX.readFile(xlsPath);
  const sheetName = workbook.SheetNames[0];
  const records = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as CleanedDrugRecord[];

  let count = 0;
  for (const r of records) {
    try {
      if (!r.drug_name && !r.name) continue;
      await db.insert(drugs).values({
        name: r.drug_name || r.name || "UNKNOWN",
        genericName: r.generic_name || r.generic || "UNKNOWN",
        category: r.category || "General",
        manufacturer: r.manufacturer || r.sponsor,
        form: r.dosage_form || r.form,
      }).onConflictDoNothing();
      count++;
    } catch (err) {
      console.warn("Failed to import XLS record:", err instanceof Error ? err.message : String(err));
    }
  }
  console.log(`✅ XLS Import Done: ${count} records.`);
}

async function main() {
  if (fs.existsSync(LOCK_FILE)) {
    console.warn("⚠️ Import lock file found. Another import may be running. Exiting...");
    process.exit(1);
  }
  fs.writeFileSync(LOCK_FILE, new Date().toISOString());

  try {
    await importNigerianCSV();
    await importCleanedXLS();
    await importFDAJson();
    console.log("🎉 ALL DATASETS PROCESSED SUCCESSFULLY!");
  } finally {
    if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
  }
  process.exit(0);
}

main().catch(err => {
  console.error("Import failed:", err);
  if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
  process.exit(1);
});
