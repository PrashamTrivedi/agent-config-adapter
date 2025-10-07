INSERT INTO configs (id, name, type, original_format, content, created_at)
VALUES (
  'seed-1',
  'Hello World Command',
  'slash_command',
  'claude_code',
  '/hello\nPrints hello world',
  datetime('now')
)
ON CONFLICT(id) DO NOTHING;
