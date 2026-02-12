/**
 * Admin API — Dashboard Stats
 *
 * GET /api/admin/stats — Get overview statistics
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET() {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [
            totalConversations,
            activeConversations,
            totalMessages,
            messagesToday,
            messagesThisWeek,
            totalActions,
            successfulActions,
            failedActions,
            verifiedVendors,
            recentActions,
        ] = await Promise.all([
            prisma.conversation.count(),
            prisma.conversation.count({ where: { status: 'ACTIVE' } }),
            prisma.message.count(),
            prisma.message.count({ where: { createdAt: { gte: today } } }),
            prisma.message.count({ where: { createdAt: { gte: thisWeek } } }),
            prisma.actionLog.count(),
            prisma.actionLog.count({ where: { success: true } }),
            prisma.actionLog.count({ where: { success: false } }),
            prisma.vendorLink.count({ where: { verified: true } }),
            prisma.actionLog.findMany({
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: {
                    id: true,
                    whatsappNumber: true,
                    action: true,
                    toolName: true,
                    success: true,
                    errorMessage: true,
                    durationMs: true,
                    createdAt: true,
                },
            }),
        ]);

        // Top actions breakdown
        const actionBreakdown = await prisma.actionLog.groupBy({
            by: ['action'],
            _count: { action: true },
            orderBy: { _count: { action: 'desc' } },
            take: 10,
        });

        return NextResponse.json({
            stats: {
                conversations: {
                    total: totalConversations,
                    active: activeConversations,
                },
                messages: {
                    total: totalMessages,
                    today: messagesToday,
                    thisWeek: messagesThisWeek,
                },
                actions: {
                    total: totalActions,
                    successful: successfulActions,
                    failed: failedActions,
                    successRate: totalActions > 0
                        ? ((successfulActions / totalActions) * 100).toFixed(1) + '%'
                        : 'N/A',
                },
                vendors: {
                    verified: verifiedVendors,
                },
            },
            topActions: actionBreakdown.map((a) => ({
                action: a.action,
                count: a._count.action,
            })),
            recentActions,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Failed to fetch stats', details: error.message },
            { status: 500 }
        );
    }
}
