"""
Drug Import Script
===================
Loads drugs from:
  - A scraped JSON file (output of nafdac_scraper.py)
  - A user-provided CSV file

Usage:
    # From scraped JSON:
    python import_drugs.py --file drugs_scraped.json

    # From your own CSV:
    python import_drugs.py --file your_drugs.csv --format csv

CSV expected columns (flexible — unmapped columns are ignored):
    name, generic_name, manufacturer, category, form, strength,
    nafdac_number, uses, contraindications, side_effects, interactions,
    price_min, price_max, requires_prescription, atc_code

Install:
    pip install psycopg2-binary python-dotenv pandas tqdm
"""

import os
import sys
import json
import argparse
import logging
from typing import Any

import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv
from tqdm import tqdm

load_dotenv(dotenv_path="../../.env")  # root .env
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    sys.exit("❌ DATABASE_URL not found in environment")


def load_json(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_csv(path: str) -> list[dict]:
    try:
        import pandas as pd
    except ImportError:
        sys.exit("Install pandas: pip install pandas")

    df = pd.read_csv(path, dtype=str).fillna("")

    # Normalize column names
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    COL_MAP = {
        "drug_name": "name",
        "brand_name": "name",
        "active_ingredient": "generic_name",
        "active_substance": "generic_name",
        "mfr": "manufacturer",
        "drug_category": "category",
        "dosage_form": "form",
        "price": "price_min",
    }
    df = df.rename(columns=COL_MAP)

    return df.to_dict("records")


def normalize(raw: dict) -> dict:
    """Map any source shape to our DB schema."""

    def listify(val: Any) -> str:
        """Convert list or comma-string to JSON array string."""
        if isinstance(val, list):
            return json.dumps([v for v in val if v])
        if isinstance(val, str) and val:
            return json.dumps([v.strip() for v in val.split(",") if v.strip()])
        return "[]"

    def safe_int(val: Any, default: int = 0) -> int:
        try:
            return int(str(val).replace("₦", "").replace(",", "").strip())
        except (ValueError, TypeError):
            return default

    return {
        "name":                  str(raw.get("name", "") or raw.get("brand_name", "")).strip(),
        "generic_name":          str(raw.get("genericName", "") or raw.get("generic_name", "")).strip(),
        "nafdac_number":         str(raw.get("nafdacNumber", "") or raw.get("nafdac_number", "")).strip(),
        "manufacturer":          str(raw.get("manufacturer", "")).strip(),
        "category":              str(raw.get("category", "")).strip(),
        "form":                  str(raw.get("form", "")).strip(),
        "strength":              str(raw.get("strength", "")).strip(),
        "brand_names":           listify(raw.get("brandNames") or raw.get("brand_names", "")),
        "uses":                  listify(raw.get("uses", "")),
        "contraindications":     listify(raw.get("contraindications", "")),
        "side_effects":          listify(raw.get("sideEffects") or raw.get("side_effects", "")),
        "interactions":          listify(raw.get("interactions", "")),
        "price_range_min":       safe_int(raw.get("priceRangeMin") or raw.get("price_min", 0)),
        "price_range_max":       safe_int(raw.get("priceRangeMax") or raw.get("price_max", 0)),
        "requires_prescription": bool(raw.get("requiresPrescription") or raw.get("requires_prescription", False)),
        "controlled":            bool(raw.get("controlled", False)),
        "atc_code":              str(raw.get("atcCode") or raw.get("atc_code", "")).strip(),
        "icd_indications":       listify(raw.get("icdIndications") or raw.get("icd_indications", "")),
    }


UPSERT_SQL = """
INSERT INTO drugs (
    name, generic_name, nafdac_number, manufacturer, category, form, strength,
    brand_names, uses, contraindications, side_effects, interactions,
    price_range_min, price_range_max, requires_prescription, controlled,
    atc_code, icd_indications
) VALUES %s
ON CONFLICT (nafdac_number) WHERE nafdac_number != ''
DO UPDATE SET
    name                  = EXCLUDED.name,
    generic_name          = EXCLUDED.generic_name,
    manufacturer          = EXCLUDED.manufacturer,
    category              = EXCLUDED.category,
    form                  = EXCLUDED.form,
    strength              = EXCLUDED.strength,
    brand_names           = EXCLUDED.brand_names,
    uses                  = EXCLUDED.uses,
    contraindications     = EXCLUDED.contraindications,
    side_effects          = EXCLUDED.side_effects,
    interactions          = EXCLUDED.interactions,
    price_range_min       = EXCLUDED.price_range_min,
    price_range_max       = EXCLUDED.price_range_max,
    requires_prescription = EXCLUDED.requires_prescription,
    controlled            = EXCLUDED.controlled,
    atc_code              = EXCLUDED.atc_code,
    icd_indications       = EXCLUDED.icd_indications
"""


def main():
    parser = argparse.ArgumentParser(description="Import drugs into MedBridge Postgres")
    parser.add_argument("--file", required=True, help="Path to JSON or CSV file")
    parser.add_argument("--format", choices=["json", "csv"], default="json")
    parser.add_argument("--batch", type=int, default=200, help="Insert batch size")
    args = parser.parse_args()

    log.info(f"Loading {args.format.upper()} from {args.file}")
    raw_drugs = load_json(args.file) if args.format == "json" else load_csv(args.file)
    log.info(f"Loaded {len(raw_drugs)} records")

    normalized = []
    skipped = 0
    for raw in raw_drugs:
        d = normalize(raw)
        if not d["name"] and not d["generic_name"]:
            skipped += 1
            continue
        normalized.append(d)

    log.info(f"Normalized: {len(normalized)} valid, {skipped} skipped (no name)")

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    COLS = [
        "name", "generic_name", "nafdac_number", "manufacturer", "category", "form", "strength",
        "brand_names", "uses", "contraindications", "side_effects", "interactions",
        "price_range_min", "price_range_max", "requires_prescription", "controlled",
        "atc_code", "icd_indications",
    ]

    inserted = 0
    for i in tqdm(range(0, len(normalized), args.batch), desc="Inserting"):
        batch = normalized[i: i + args.batch]
        rows = [tuple(d[c] for c in COLS) for d in batch]
        # use execute_values properly:
        execute_values(
            cur,
            f"""
            INSERT INTO drugs ({', '.join(COLS)})
            VALUES %s
            ON CONFLICT (nafdac_number) WHERE nafdac_number != ''
            DO UPDATE SET {', '.join(f"{c} = EXCLUDED.{c}" for c in COLS if c != 'nafdac_number')}
            """,
            rows
        )
        conn.commit()
        inserted += len(batch)

    cur.close()
    conn.close()
    log.info(f"✅ Imported {inserted} drugs into Postgres")


if __name__ == "__main__":
    main()