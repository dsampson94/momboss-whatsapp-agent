/**
 * Health Check API Route
 *
 * GET /api/health — Check all service connections
 */

import { NextResponse } from 'next/server';
import { checkWordPressConnection } from '@/app/lib/wordpress';
import prisma from '@/app/lib/prisma';
import logger from '@/app/lib/logger';

export async function GET() {
    const checks: Record<string, any> = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'MomBoss WhatsApp Agent',
        uptime: process.uptime(),
    };

    // Check database
    try {
        await prisma.$queryRaw`SELECT 1`;
        checks.database = { connected: true };
    } catch (error: any) {
        checks.database = { connected: false, error: error.message };
        checks.status = 'degraded';
    }

    // Check WordPress/WooCommerce
    try {
        const wpStatus = await checkWordPressConnection();
        checks.wordpress = wpStatus.wordpress;
        checks.woocommerce = wpStatus.woocommerce;
        if (!wpStatus.wordpress.connected || !wpStatus.woocommerce.connected) {
            checks.status = 'degraded';
        }
    } catch (error: any) {
        checks.wordpress = { connected: false, error: error.message };
        checks.woocommerce = { connected: false, error: error.message };
        checks.status = 'degraded';
    }

    // Check env vars are set (don't expose values)
    checks.config = {
        openai_key: !!process.env.OPENAI_API_KEY,
        twilio_sid: !!process.env.TWILIO_ACCOUNT_SID,
        twilio_token: !!process.env.TWILIO_AUTH_TOKEN,
        wordpress_url: !!process.env.WORDPRESS_URL,
        wc_key: !!process.env.WOOCOMMERCE_CONSUMER_KEY,
        database_url: !!process.env.DATABASE_URL,
    };

    const statusCode = checks.status === 'ok' ? 200 : 503;

    logger.info('[Health] Health check', { status: checks.status });

    return NextResponse.json(checks, { status: statusCode });
}
