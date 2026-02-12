/**
 * Admin API — Single Conversation with Messages
 *
 * GET /api/admin/conversations/[id] — Get conversation with full message history
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const conversation = await prisma.conversation.findUnique({
            where: { id },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    select: {
                        id: true,
                        direction: true,
                        senderType: true,
                        content: true,
                        contentType: true,
                        mediaUrl: true,
                        toolCalls: true,
                        wpAction: true,
                        wpResult: true,
                        tokensUsed: true,
                        createdAt: true,
                    },
                },
            },
        });

        if (!conversation) {
            return NextResponse.json(
                { error: 'Conversation not found' },
                { status: 404 }
            );
        }

        // Also get vendor link info
        const vendorLink = await prisma.vendorLink.findUnique({
            where: { whatsappNumber: conversation.whatsappNumber },
        });

        return NextResponse.json({
            conversation: {
                ...conversation,
                vendorLink: vendorLink || null,
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Failed to fetch conversation', details: error.message },
            { status: 500 }
        );
    }
}
