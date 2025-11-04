-- Create skill_files table for multi-file skill support
CREATE TABLE skill_files (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (skill_id) REFERENCES configs(id) ON DELETE CASCADE
);

CREATE INDEX idx_skill_files_skill_id ON skill_files(skill_id);
CREATE UNIQUE INDEX idx_skill_files_skill_path ON skill_files(skill_id, file_path);
