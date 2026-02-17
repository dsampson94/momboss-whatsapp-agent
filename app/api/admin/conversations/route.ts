/**
 * Admin Dashboard API — Conversations & Stats
 *
 * GET /api/admin/conversations — List recent conversations
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/admin-auth';

export async function GET(request: NextRequest) {
    const authError = requireAdmin(request);
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const skip = (page - 1) * limit;

        const [conversations, total] = await Promise.all([
            prisma.conversation.findMany({
                orderBy: { lastMessageAt: 'desc' },
                skip,
                take: limit,
                include: {
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        select: {
                            content: true,
                            direction: true,
                            createdAt: true,
                        },
                    },
                    _count: { select: { messages: true } },
                },
            }),
            prisma.conversation.count(),
        ]);

        return NextResponse.json({
            conversations: conversations.map((c) => ({
                id: c.id,
                whatsappNumber: c.whatsappNumber,
                vendorName: c.vendorName,
                status: c.status,
                wpUserId: c.wpUserId,
                wpStoreId: c.wpStoreId,
                isHandedOff: c.isHandedOff,
                messageCount: c._count.messages,
                lastMessage: c.messages[0] || null,
                lastMessageAt: c.lastMessageAt,
                createdAt: c.createdAt,
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Failed to fetch conversations', details: error.message },
            { status: 500 }
        );
    }
}
