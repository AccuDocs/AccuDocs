-- ============================================================
-- Migration 011: Hierarchical Item Categories
-- Converts simple category tree to full self-referencing hierarchy
-- with materialized paths, level tracking, and defaults
-- ============================================================

-- First, rename the old table to preserve data
ALTER TABLE item_categories RENAME TO item_categories_old;

-- Create new enhanced item_categories table
CREATE TABLE item_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          VARCHAR(120) NOT NULL,
  code          VARCHAR(20),
  parent_id     UUID REFERENCES item_categories(id) ON DELETE RESTRICT,
  level         SMALLINT NOT NULL DEFAULT 1,
  path          VARCHAR(500),
  sort_order    SMALLINT DEFAULT 0,
  default_hsn   VARCHAR(20),
  default_gst_rate DECIMAL(5,2),
  default_uom   VARCHAR(30),
  allow_items   BOOLEAN DEFAULT true,
  description   TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, code)
);

-- Create indexes for tree traversal
CREATE INDEX idx_cat_parent ON item_categories(parent_id);
CREATE INDEX idx_cat_path   ON item_categories(path text_pattern_ops);
CREATE INDEX idx_cat_org    ON item_categories(org_id);
CREATE INDEX idx_cat_active ON item_categories(org_id, is_active);

-- Migrate data from old table (convert to top-level groups with default values)
INSERT INTO item_categories (id, org_id, name, code, parent_id, level, path, sort_order, default_hsn, default_gst_rate, default_uom, allow_items, description, is_active, created_at, updated_at)
SELECT 
  id, 
  org_id, 
  name, 
  LOWER(SUBSTRING(name, 1, 3)) as code,
  NULL as parent_id,
  1 as level,
  '/' || id::text as path,
  0 as sort_order,
  NULL as default_hsn,
  18 as default_gst_rate,
  'PCS' as default_uom,
  true as allow_items,
  description,
  is_active,
  created_at,
  updated_at
FROM item_categories_old;

-- Drop old table
DROP TABLE item_categories_old;

-- Add function to compute path and level on insert/update
CREATE OR REPLACE FUNCTION update_category_path()
RETURNS TRIGGER AS $$
DECLARE
  parent_path VARCHAR(500);
  parent_level SMALLINT;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.level := 1;
    NEW.path := '/' || NEW.id::text;
  ELSE
    SELECT path, level INTO parent_path, parent_level
    FROM item_categories
    WHERE id = NEW.parent_id;
    
    IF parent_path IS NULL THEN
      RAISE EXCEPTION 'Parent category not found';
    END IF;
    
    NEW.level := parent_level + 1;
    NEW.path := parent_path || '/' || NEW.id::text;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on insert
CREATE TRIGGER category_path_insert
BEFORE INSERT ON item_categories
FOR EACH ROW
EXECUTE FUNCTION update_category_path();

-- Trigger on parent_id change
CREATE TRIGGER category_path_update
BEFORE UPDATE OF parent_id ON item_categories
FOR EACH ROW
WHEN (OLD.parent_id IS DISTINCT FROM NEW.parent_id)
EXECUTE FUNCTION update_category_path();
