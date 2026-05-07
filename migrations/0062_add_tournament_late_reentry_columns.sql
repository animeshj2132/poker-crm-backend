-- Ensure tournaments has explicit late registration and re-entry columns.
-- Backfill from structure JSON for legacy rows.

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS late_registration INTEGER,
  ADD COLUMN IF NOT EXISTS allow_reentry BOOLEAN;

UPDATE tournaments
SET late_registration = COALESCE(
  late_registration,
  NULLIF((structure->>'late_registration'), '')::INTEGER,
  60
)
WHERE late_registration IS NULL;

UPDATE tournaments
SET allow_reentry = COALESCE(
  allow_reentry,
  CASE
    WHEN lower(COALESCE(structure->>'allow_reentry', '')) IN ('true', 't', '1', 'yes', 'y') THEN TRUE
    WHEN lower(COALESCE(structure->>'allow_reentry', '')) IN ('false', 'f', '0', 'no', 'n') THEN FALSE
    ELSE FALSE
  END
)
WHERE allow_reentry IS NULL;

ALTER TABLE tournaments
  ALTER COLUMN late_registration SET DEFAULT 60,
  ALTER COLUMN allow_reentry SET DEFAULT FALSE;
