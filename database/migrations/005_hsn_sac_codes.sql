-- Migration 005: HSN/SAC code directory table
-- Run: psql -d accudocs -f database/migrations/005_hsn_sac_codes.sql

CREATE TABLE IF NOT EXISTS hsn_sac_codes (
  id            UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code          VARCHAR(8)    NOT NULL,
  description   TEXT          NOT NULL,
  gst_rate      NUMERIC(5,2)  NOT NULL DEFAULT 0,
  type          CHAR(3)       NOT NULL CHECK (type IN ('HSN', 'SAC')),
  chapter       VARCHAR(10),
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Unique index on (code, type) — HSN and SAC can share codes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'hsn_sac_codes' AND indexname = 'hsn_sac_codes_code_type_idx'
  ) THEN
    CREATE UNIQUE INDEX hsn_sac_codes_code_type_idx ON hsn_sac_codes(code, type);
  END IF;
END $$;

-- Full-text search index
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'hsn_sac_codes' AND indexname = 'hsn_sac_codes_search_idx'
  ) THEN
    CREATE INDEX hsn_sac_codes_search_idx
      ON hsn_sac_codes USING gin(to_tsvector('english', code || ' ' || description));
  END IF;
END $$;

COMMENT ON TABLE hsn_sac_codes IS 'Master list of HSN (goods) and SAC (services) codes for GST';
