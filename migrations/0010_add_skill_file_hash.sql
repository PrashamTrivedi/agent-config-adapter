-- Add file_hash column to skill_files for content-based change detection.
-- Nullable: existing rows get NULL and are treated as "changed" once, then
-- self-heal on the next sync. Reversible (drop column); no data rewrite.
ALTER TABLE skill_files ADD COLUMN file_hash TEXT;
