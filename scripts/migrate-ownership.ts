#!/usr/bin/env npx tsx
/**
 * Migration script to associate existing configs with users
 *
 * This script:
 * 1. Reads email subscriptions from KV
 * 2. Creates user accounts for subscribed emails
 * 3. Associates orphaned configs/extensions/marketplaces with users
 *
 * Run with: npx tsx scripts/migrate-ownership.ts
 *
 * Note: This is a one-time migration for the GitHub auth transition
 */

console.log('=== Ownership Migration Script ===');
console.log('This script migrates email subscribers to GitHub auth users');
console.log('');
console.log('IMPORTANT: This script should be run after deploying the new auth system');
console.log('');
console.log('Steps to complete the migration:');
console.log('');
console.log('1. Deploy the new auth system with database migrations');
console.log('   npx wrangler d1 migrations apply agent-config-adapter --remote');
console.log('');
console.log('2. Export subscriber emails from KV (manual step):');
console.log('   npx wrangler kv:key list --namespace-id=<EMAIL_SUBSCRIPTIONS_ID>');
console.log('');
console.log('3. For each subscriber, send an email notification about:');
console.log('   - The new GitHub auth requirement');
console.log('   - How to link their existing configs to their account');
console.log('   - The benefits of the new auth system (API keys, MCP OAuth)');
console.log('');
console.log('4. Create user accounts when users first authenticate:');
console.log('   - Better Auth handles user creation on first login');
console.log('   - Email OTP users get accounts created automatically');
console.log('   - GitHub OAuth users get accounts linked to their profile');
console.log('');
console.log('5. For existing configs without owners (user_id IS NULL):');
console.log('   - Keep them as public/legacy');
console.log('   - Allow any authenticated user to "claim" ownership');
console.log('   - Or manually assign ownership based on email history');
console.log('');
console.log('=== SQL Queries for Manual Migration ===');
console.log('');
console.log('-- Count orphaned resources:');
console.log('SELECT');
console.log("  (SELECT COUNT(*) FROM configs WHERE user_id IS NULL) as orphaned_configs,");
console.log("  (SELECT COUNT(*) FROM extensions WHERE user_id IS NULL) as orphaned_extensions,");
console.log("  (SELECT COUNT(*) FROM marketplaces WHERE user_id IS NULL) as orphaned_marketplaces;");
console.log('');
console.log('-- Assign ownership by email (after user creates account):');
console.log("-- UPDATE configs SET user_id = '<user_id>' WHERE id IN (<config_ids>);");
console.log('');
console.log('=== Claim Orphaned Configs Feature ===');
console.log('');
console.log('Consider adding a "Claim Config" feature:');
console.log('1. Show orphaned configs on the UI');
console.log('2. Allow authenticated users to claim ownership');
console.log('3. First-come-first-served or admin approval');
console.log('');

// This script is informational - actual migration happens through:
// 1. Database migrations (already applied)
// 2. User self-service (claim configs)
// 3. Admin manual assignment if needed
