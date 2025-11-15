/**
 * Token-based authentication for MCP admin endpoint
 * Temporary solution until full user auth is implemented
 */

/**
 * Validate MCP admin token using hash comparison
 * Tokens are hashed with SHA-256 before comparison for security
 */
export async function validateMCPAdminToken(
	request: Request,
	storedTokenHash?: string,
): Promise<boolean> {
	// No token hash configured = reject all requests
	if (!storedTokenHash) {
		console.warn('MCP_ADMIN_TOKEN_HASH not configured');
		return false;
	}

	// Extract Bearer token from Authorization header
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return false;
	}

	const providedToken = authHeader.substring(7).trim();
	if (!providedToken) {
		return false;
	}

	// Hash the provided token
	const providedHash = await hashToken(providedToken);

	// Constant-time comparison to prevent timing attacks
	return providedHash === storedTokenHash;
}

/**
 * Hash a token using SHA-256
 * Uses Web Crypto API (available in Cloudflare Workers)
 */
export async function hashToken(token: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(token);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a secure random token
 * For creating new MCP admin tokens
 */
export function generateSecureToken(length: number = 32): string {
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}
