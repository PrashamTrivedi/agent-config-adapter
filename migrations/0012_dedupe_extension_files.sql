-- Remove duplicate extension_files rows created by concurrent lazy generation,
-- keeping the earliest row per (extension_id, file_path). Duplicates share the
-- same deterministic r2_key, so no R2 objects are orphaned.
DELETE FROM extension_files
WHERE rowid NOT IN (
  SELECT MIN(rowid) FROM extension_files GROUP BY extension_id, file_path
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_extension_files_extension_path
  ON extension_files(extension_id, file_path);
