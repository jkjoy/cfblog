import type { Context, Next } from 'hono';
import { SignJWT, jwtVerify } from 'jose';
import type { AppContext, AppEnv, JWTPayload, User } from './types';
import { createWPError } from './utils';
import bcrypt from 'bcryptjs';

// Generate JWT token
export async function generateToken(user: User, secret: string): Promise<string> {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  };

  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);

  return token;
}

// Verify JWT token
export async function verifyToken(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(secret);

    const { payload } = await jwtVerify(token, secretKey);
    return payload as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Compare password
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Extract token from request
export function extractToken(c: Context): string | null {
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Also check for cookie-based auth
  const cookie = c.req.header('Cookie');
  if (cookie) {
    const match = cookie.match(/auth_token=([^;]+)/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

// Auth middleware - requires authentication
export async function authMiddleware(c: AppContext, next: Next) {
  const token = extractToken(c);

  console.log('[DEBUG] Auth middleware - Token:', token ? token.substring(0, 20) + '...' : 'null');

  if (!token) {
    return createWPError('rest_not_logged_in', 'You are not currently logged in.', 401);
  }

  const payload = await verifyToken(token, c.env.JWT_SECRET);

  console.log('[DEBUG] Auth middleware - Payload:', payload);

  if (!payload) {
    return createWPError('rest_invalid_token', 'Invalid or expired token.', 401);
  }

  // Store user info in context
  c.set('user', payload);

  await next();
}

// Optional auth middleware - doesn't require authentication but populates user if authenticated
export async function optionalAuthMiddleware(c: AppContext, next: Next) {
  const token = extractToken(c);

  if (token) {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (payload) {
      c.set('user', payload);
    }
  }

  await next();
}

// Role-based authorization middleware
export function requireRole(...allowedRoles: string[]) {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get('user') as JWTPayload | undefined;

    console.log('[DEBUG] requireRole - User:', user);
    console.log('[DEBUG] requireRole - Allowed roles:', allowedRoles);
    console.log('[DEBUG] requireRole - User role:', user?.role);

    if (!user) {
      return createWPError('rest_not_logged_in', 'You are not currently logged in.', 401);
    }

    if (!allowedRoles.includes(user.role)) {
      console.log('[DEBUG] requireRole - FORBIDDEN: User role', user.role, 'not in', allowedRoles);
      return createWPError(
        'rest_forbidden',
        'Sorry, you are not allowed to do that.',
        403
      );
    }

    console.log('[DEBUG] requireRole - ALLOWED');
    await next();
  };
}

// Check if user can edit post
export async function canEditPost(c: Context<AppEnv>, postId: number): Promise<boolean> {
  const user = c.get('user') as JWTPayload | undefined;

  if (!user) {
    return false;
  }

  // Admin and editor can edit any post
  if (user.role === 'administrator' || user.role === 'editor') {
    return true;
  }

  // Author can edit their own posts
  if (user.role === 'author' || user.role === 'contributor') {
    const post = await c.env.DB.prepare('SELECT author_id FROM posts WHERE id = ?')
      .bind(postId)
      .first<{ author_id: number }>();

    return post?.author_id === user.userId;
  }

  return false;
}

// Check if user can delete post
export async function canDeletePost(c: Context<AppEnv>, postId: number): Promise<boolean> {
  const user = c.get('user') as JWTPayload | undefined;

  if (!user) {
    return false;
  }

  // Only admin and editor can delete posts
  if (user.role === 'administrator' || user.role === 'editor') {
    return true;
  }

  return false;
}

// Check if user can publish post
export function canPublishPost(user: JWTPayload | undefined): boolean {
  if (!user) {
    return false;
  }

  return ['administrator', 'editor', 'author'].includes(user.role);
}
