import { describe, it, expect } from 'vitest';
import { validateMCPAdminToken, hashToken } from '../../src/mcp/auth';

describe('MCP Auth', () => {
	describe('hashToken', () => {
		it('should generate consistent SHA-256 hash for same input', async () => {
			const token = 'test-token-123';
			const hash1 = await hashToken(token);
			const hash2 = await hashToken(token);

			expect(hash1).toBe(hash2);
			expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
		});

		it('should generate different hashes for different inputs', async () => {
			const hash1 = await hashToken('token1');
			const hash2 = await hashToken('token2');

			expect(hash1).not.toBe(hash2);
		});

		it('should generate expected hash for known input', async () => {
			// Hash for "test-admin-token-123"
			const expectedHash =
				'bef57ec7f53a6d40beb640a780a639c83bc29ac8a9816f1fc6c5c6dcd93c4721';
			const actualHash = await hashToken('test-admin-token-123');

			expect(actualHash).toBe(expectedHash);
		});
	});

	describe('validateMCPAdminToken', () => {
		const validToken = 'test-admin-token-123';
		const validTokenHash =
			'bef57ec7f53a6d40beb640a780a639c83bc29ac8a9816f1fc6c5c6dcd93c4721';

		it('should reject when no token hash is configured', async () => {
			const request = new Request('https://example.com', {
				method: 'POST',
				headers: {
					Authorization: 'Bearer some-token',
				},
			});

			const isValid = await validateMCPAdminToken(request, undefined);
			expect(isValid).toBe(false);
		});

		it('should reject when no Authorization header present', async () => {
			const request = new Request('https://example.com', {
				method: 'POST',
			});

			const isValid = await validateMCPAdminToken(request, validTokenHash);
			expect(isValid).toBe(false);
		});

		it('should reject when Authorization header is not Bearer format', async () => {
			const request = new Request('https://example.com', {
				method: 'POST',
				headers: {
					Authorization: 'Basic some-credentials',
				},
			});

			const isValid = await validateMCPAdminToken(request, validTokenHash);
			expect(isValid).toBe(false);
		});

		it('should reject when Bearer token is empty', async () => {
			const request = new Request('https://example.com', {
				method: 'POST',
				headers: {
					Authorization: 'Bearer ',
				},
			});

			const isValid = await validateMCPAdminToken(request, validTokenHash);
			expect(isValid).toBe(false);
		});

		it('should reject when token hash does not match', async () => {
			const request = new Request('https://example.com', {
				method: 'POST',
				headers: {
					Authorization: 'Bearer wrong-token',
				},
			});

			const isValid = await validateMCPAdminToken(request, validTokenHash);
			expect(isValid).toBe(false);
		});

		it('should accept when token hash matches', async () => {
			const request = new Request('https://example.com', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${validToken}`,
				},
			});

			const isValid = await validateMCPAdminToken(request, validTokenHash);
			expect(isValid).toBe(true);
		});

		it('should handle token with extra whitespace', async () => {
			const request = new Request('https://example.com', {
				method: 'POST',
				headers: {
					Authorization: `Bearer  ${validToken}  `,
				},
			});

			const isValid = await validateMCPAdminToken(request, validTokenHash);
			expect(isValid).toBe(false); // Extra whitespace changes the token
		});
	});
});
