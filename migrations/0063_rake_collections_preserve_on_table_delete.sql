-- Migration: 0063_rake_collections_preserve_on_table_delete
-- Rake records must survive table deletion.
-- Change table_id FK from ON DELETE CASCADE to ON DELETE SET NULL.

DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  WHERE t.relname = 'rake_collections'
    AND c.contype = 'f'
    AND c.confrelid = (SELECT oid FROM pg_class WHERE relname = 'tables');

  IF fk_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE rake_collections DROP CONSTRAINT ' || quote_ident(fk_name);
  END IF;
END $$;

-- Make column nullable so SET NULL can work
ALTER TABLE rake_collections ALTER COLUMN table_id DROP NOT NULL;

-- Re-add FK with SET NULL so rake records are preserved when table is deleted
ALTER TABLE rake_collections
  ADD CONSTRAINT rake_collections_table_id_fkey
  FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL;
