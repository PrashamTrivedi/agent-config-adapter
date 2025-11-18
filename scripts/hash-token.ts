#!/usr/bin/env node

/**
 * Generate SHA-256 hash of MCP admin token
 * Usage: tsx scripts/hash-token.ts "your-secret-token"
 */

async function hashToken(token: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(token);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function main() {
	const token = process.argv[2];

	if (!token) {
		console.error('Usage: tsx scripts/hash-token.ts "your-token"');
		console.error('');
		console.error('Example:');
		console.error('  tsx scripts/hash-token.ts "my-secure-token-123"');
		process.exit(1);
	}

	const hash = await hashToken(token);

	console.log('Token Hash (SHA-256):');
	console.log(hash);
	console.log('');
	console.log('Set this hash as MCP_ADMIN_TOKEN_HASH secret:');
	console.log('npx wrangler secret put MCP_ADMIN_TOKEN_HASH');
	console.log('Then paste the hash above when prompted.');
	console.log('');
	console.log('For local development (.dev.vars):');
	console.log(`MCP_ADMIN_TOKEN_HASH=${hash}`);
}

main().catch(console.error);
