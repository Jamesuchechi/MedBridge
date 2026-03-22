-- Migration: 0002_expand_drugs_table.sql
-- Adds all Phase 2.1 fields to the drugs table

ALTER TABLE "drugs"
  ADD COLUMN IF NOT EXISTS "nafdac_number"         text DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS "brand_names"            text DEFAULT '[]' NOT NULL,
  ADD COLUMN IF NOT EXISTS "uses"                   text DEFAULT '[]' NOT NULL,
  ADD COLUMN IF NOT EXISTS "contraindications"      text DEFAULT '[]' NOT NULL,
  ADD COLUMN IF NOT EXISTS "side_effects"           text DEFAULT '[]' NOT NULL,
  ADD COLUMN IF NOT EXISTS "interactions"           text DEFAULT '[]' NOT NULL,
  ADD COLUMN IF NOT EXISTS "price_range_min"        integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "price_range_max"        integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "requires_prescription"  boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "controlled"             boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "atc_code"               text DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS "icd_indications"        text DEFAULT '[]' NOT NULL;

-- Create a unique constraint on nafdac_number for the upsert in import_drugs.py
-- (only where nafdac_number is non-empty)
CREATE UNIQUE INDEX IF NOT EXISTS drugs_nafdac_number_unique
  ON drugs (nafdac_number)
  WHERE nafdac_number != '';

-- Full-text search index for Postgres fallback search
-- (used when Typesense is unavailable)
ALTER TABLE drugs
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(generic_name, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(brand_names, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(category, '')), 'C') ||
      setweight(to_tsvector('english', coalesce(uses, '')), 'D')
    ) STORED;

CREATE INDEX IF NOT EXISTS drugs_search_vector_idx
  ON drugs USING gin(search_vector);

-- Index on category for filtered queries
CREATE INDEX IF NOT EXISTS drugs_category_idx ON drugs (category);

-- Index on requires_prescription for filtering
CREATE INDEX IF NOT EXISTS drugs_rx_idx ON drugs (requires_prescription);