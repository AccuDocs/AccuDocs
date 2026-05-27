-- Migration 019: database backup run history
-- Run from repo root:
--   psql -d accudocs -f database/migrations/019_backup_runs.sql

CREATE TABLE IF NOT EXISTS backup_runs (
  id              UUID        NOT NULL PRIMARY KEY,
  kind            VARCHAR(20) NOT NULL CHECK (kind IN ('schema', 'full')),
  status          VARCHAR(20) NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  triggered_by    VARCHAR(20) NOT NULL CHECK (triggered_by IN ('manual', 'scheduled')),
  file_name       TEXT,
  local_path      TEXT,
  size_bytes      BIGINT,
  checksum_sha256 VARCHAR(64),
  drive_file_id   TEXT,
  drive_web_url   TEXT,
  error_message   TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  created_by      UUID
);

CREATE INDEX IF NOT EXISTS backup_runs_started_at_idx
  ON backup_runs(started_at DESC);

COMMENT ON TABLE backup_runs IS 'Audit history for manual and scheduled database backup artifacts uploaded to Google Drive.';
