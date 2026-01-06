# Spec 01: Database Schema Migrations

## Purpose
Add authentication tables for Better Auth and user ownership columns to existing tables.

## Files to Create

### `migrations/0008_add_auth_tables.sql`

Better Auth required tables:
- `user` - User accounts
- `session` - Active sessions
- `account` - OAuth provider accounts
- `verification` - OTP/magic link codes

MCP OAuth table:
- `api_keys` - API keys for MCP clients

### `migrations/0009_add_user_ownership.sql`

Add `user_id` columns to:
- `configs`
- `extensions`
- `marketplaces`

## SQL Details

See main taskFindings.md for complete SQL.

## Validation

```bash
# Apply migrations locally
npx wrangler d1 execute agent-config-adapter --local --file=./migrations/0008_add_auth_tables.sql
npx wrangler d1 execute agent-config-adapter --local --file=./migrations/0009_add_user_ownership.sql

# Verify tables exist
npx wrangler d1 execute agent-config-adapter --local --command="SELECT name FROM sqlite_master WHERE type='table';"

# Verify columns
npx wrangler d1 execute agent-config-adapter --local --command="PRAGMA table_info(configs);"
```

## Notes

- All foreign keys use `ON DELETE CASCADE` for user deletion
- user_id columns are nullable initially for migration
- Indexes added for performance on user_id lookups
