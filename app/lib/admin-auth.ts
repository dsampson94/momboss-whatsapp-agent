/**
 * Admin Authentication Middleware
 *
 * Protects the /api/admin/* routes with a secret key.
 * The key must be sent as a Bearer token in the Authorization header,
 * or as the `key` query parameter for browser-based dashboard access.
 *
 * In development mode (no ADMIN_API_SECRET set), all requests are allowed.
 *
 * Usage in routes:
 *   import { requireAdmin } from '@/app/lib/admin-auth';
 *
 *   export async function GET(request: NextRequest) {
 *       const authError = requireAdmin(request);
 *       if (authError) return authError;
 *       // ... your route logic
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from './logger';

const ADMIN_API_SECRET = (process.env.ADMIN_API_SECRET || '').trim();

/**
 * Check if the request has valid admin credentials.
 * Returns null if authorized, or a NextResponse with 401 if not.
 */
export function requireAdmin(request: NextRequest): NextResponse | null {
    // In dev mode without a secret configured, allow everything
    if (!ADMIN_API_SECRET) {
        logger.warn('[Admin Auth] No ADMIN_API_SECRET set — allowing all admin requests (dev mode)');
        return null;
    }

    // Check Authorization: Bearer <token>
    const authHeader = request.headers.get('authorization') || '';
    if (authHeader.startsWith('Bearer ') && authHeader.slice(7).trim() === ADMIN_API_SECRET) {
        return null;
    }

    // Check ?key=<token> query param (for browser/dashboard access)
    const { searchParams } = new URL(request.url);
    const keyParam = searchParams.get('key');
    if (keyParam && keyParam === ADMIN_API_SECRET) {
        return null;
    }

    logger.warn('[Admin Auth] Unauthorized admin API access attempt', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        path: request.nextUrl.pathname,
    });

    return NextResponse.json(
        { error: 'Unauthorized. Set Authorization: Bearer <ADMIN_API_SECRET> header.' },
        { status: 401 }
    );
}
