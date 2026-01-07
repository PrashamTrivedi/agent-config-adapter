/**
 * Authentication types for Better Auth integration
 */

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  expiresAt: Date;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  userId: string;
}

export interface Account {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  idToken?: string | null;
  accessTokenExpiresAt?: Date | null;
  refreshTokenExpiresAt?: Date | null;
  scope?: string | null;
  password?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Verification {
  id: string;
  identifier: string;
  value: string;
  expiresAt: Date;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface ApiKey {
  id: string;
  key_hash: string;
  user_id: string;
  name: string;
  created_at: number;
  last_used_at?: number | null;
  expires_at?: number | null;
  is_active: number;
}

export interface AuthContext {
  session: Session | null;
  user: User | null;
  userId: string | null;
}

// Better Auth session response type - looser to match actual API
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BetterAuthSession = any;

// Augment Hono's context to include auth data
declare module 'hono' {
  interface ContextVariableMap {
    session: BetterAuthSession | null;
    user: BetterAuthSession['user'] | null;
    userId: string | null;
    authType: 'session' | 'api_key' | 'jwt' | null;
    subscriberEmail?: string;
  }
}
