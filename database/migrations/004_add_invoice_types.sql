-- Migration 004: Add invoice types, payment link columns, and expiry date
-- Run: psql -d accudocs -f database/migrations/004_add_invoice_types.sql

-- Add invoice_type column to invoices table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'invoice_type'
  ) THEN
    ALTER TABLE invoices
      ADD COLUMN invoice_type VARCHAR(15) NOT NULL DEFAULT 'tax_invoice';

    COMMENT ON COLUMN invoices.invoice_type IS
      'Type: tax_invoice | proforma | quotation | credit_note | debit_note';
  END IF;
END $$;

-- Add payment link token column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'payment_link_token'
  ) THEN
    ALTER TABLE invoices
      ADD COLUMN payment_link_token UUID;
  END IF;
END $$;

-- Add payment link expiry column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'payment_link_expires_at'
  ) THEN
    ALTER TABLE invoices
      ADD COLUMN payment_link_expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add expiry date for quotations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'expiry_date'
  ) THEN
    ALTER TABLE invoices
      ADD COLUMN expiry_date DATE;

    COMMENT ON COLUMN invoices.expiry_date IS
      'Used for quotations: validity expiry date';
  END IF;
END $$;

-- Unique index on payment_link_token for fast token lookups
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'invoices' AND indexname = 'invoices_payment_link_token_idx'
  ) THEN
    CREATE UNIQUE INDEX invoices_payment_link_token_idx
      ON invoices(payment_link_token)
      WHERE payment_link_token IS NOT NULL;
  END IF;
END $$;
