/**
 * Conversation Manager
 *
 * Manages conversation state in the database.
 * Stores messages, retrieves history for GPT context,
 * and handles conversation lifecycle.
 */

import prisma from './prisma';
import logger from './logger';
import type { ContentType, MessageDirection, SenderType } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface IncomingMessage {
    from: string;           // WhatsApp number (e.g., "+27821234567")
    body: string;           // Message text
    profileName?: string;   // WhatsApp display name
    mediaUrl?: string;      // If they sent an image/document
    mediaType?: string;     // MIME type of media
    twilioSid?: string;     // Twilio message SID
}

export interface ConversationContext {
    conversationId: string;
    whatsappNumber: string;
    vendorName: string | null;
    wpUserId: number | null;
    wpStoreId: number | null;
    isVerified: boolean;
    messageHistory: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
}

// ============================================
// GET OR CREATE CONVERSATION
// ============================================

/**
 * Get existing conversation for a WhatsApp number, or create a new one.
 */
export async function getOrCreateConversation(
    whatsappNumber: string,
    profileName?: string
) {
    try {
        let conversation = await prisma.conversation.findUnique({
            where: { whatsappNumber },
        });

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    whatsappNumber,
                    vendorName: profileName || null,
                    status: 'ACTIVE',
                },
            });
            logger.info(`[Conversation] New conversation created for ${whatsappNumber}`);
        } else if (profileName && !conversation.vendorName) {
            // Update vendor name if we didn't have it
            conversation = await prisma.conversation.update({
                where: { id: conversation.id },
                data: { vendorName: profileName },
            });
        }

        return conversation;
    } catch (error) {
        logger.error('[Conversation] Failed to get/create conversation', { error, whatsappNumber });
        throw error;
    }
}

// ============================================
// STORE MESSAGE
// ============================================

/**
 * Save an inbound or outbound message to the database.
 */
export async function storeMessage(params: {
    conversationId: string;
    direction: MessageDirection;
    senderType: SenderType;
    content: string | null;
    contentType?: ContentType;
    mediaUrl?: string;
    twilioSid?: string;
    toolCalls?: any;
    wpAction?: string;
    wpResult?: any;
    tokensUsed?: number;
}) {
    try {
        const message = await prisma.message.create({
            data: {
                conversationId: params.conversationId,
                direction: params.direction,
                senderType: params.senderType,
                content: params.content,
                contentType: params.contentType || 'TEXT',
                mediaUrl: params.mediaUrl,
                twilioSid: params.twilioSid,
                toolCalls: params.toolCalls,
                wpAction: params.wpAction,
                wpResult: params.wpResult,
                tokensUsed: params.tokensUsed,
            },
        });

        // Update conversation last message timestamp
        await prisma.conversation.update({
            where: { id: params.conversationId },
            data: { lastMessageAt: new Date() },
        });

        return message;
    } catch (error) {
        logger.error('[Conversation] Failed to store message', { error, params });
        throw error;
    }
}

// ============================================
// GET CONVERSATION HISTORY (FOR GPT CONTEXT)
// ============================================

/**
 * Build the conversation context that gets sent to GPT.
 * Retrieves recent message history and vendor link info.
 */
export async function getConversationContext(
    whatsappNumber: string,
    maxMessages: number = 20
): Promise<ConversationContext> {
    const conversation = await prisma.conversation.findUnique({
        where: { whatsappNumber },
        include: {
            messages: {
                orderBy: { createdAt: 'desc' },
                take: maxMessages,
                select: {
                    direction: true,
                    senderType: true,
                    content: true,
                    contentType: true,
                    createdAt: true,
                },
            },
        },
    });

    if (!conversation) {
        throw new Error(`No conversation found for ${whatsappNumber}`);
    }

    // Check vendor link
    const vendorLink = await prisma.vendorLink.findUnique({
        where: { whatsappNumber },
    });

    // Convert messages to GPT format (reverse to chronological order)
    const messageHistory = conversation.messages
        .reverse()
        .filter((m) => m.content) // skip empty content
        .map((m) => ({
            role: (m.direction === 'INBOUND' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: m.content!,
        }));

    return {
        conversationId: conversation.id,
        whatsappNumber,
        vendorName: conversation.vendorName,
        wpUserId: vendorLink?.wpUserId || conversation.wpUserId,
        wpStoreId: vendorLink?.wpStoreId || conversation.wpStoreId,
        isVerified: vendorLink?.verified || false,
        messageHistory,
    };
}

// ============================================
// LOG AGENT ACTION
// ============================================

/**
 * Log a tool call / WordPress action to the ActionLog table.
 */
export async function logAction(params: {
    whatsappNumber: string;
    action: string;
    toolName: string;
    input?: any;
    output?: any;
    success: boolean;
    errorMessage?: string;
    durationMs?: number;
}) {
    try {
        await prisma.actionLog.create({
            data: {
                whatsappNumber: params.whatsappNumber,
                action: params.action,
                toolName: params.toolName,
                input: params.input,
                output: params.output,
                success: params.success,
                errorMessage: params.errorMessage,
                durationMs: params.durationMs,
            },
        });
    } catch (error) {
        // Don't throw — logging failures shouldn't break the flow
        logger.error('[ActionLog] Failed to log action', { error, params });
    }
}

// ============================================
// VENDOR LINK MANAGEMENT
// ============================================

/**
 * Link a WhatsApp number to a WordPress/Dokan vendor.
 */
export async function linkVendor(params: {
    whatsappNumber: string;
    wpUserId: number;
    wpStoreId?: number;
    storeName?: string;
    storeUrl?: string;
}) {
    try {
        const link = await prisma.vendorLink.upsert({
            where: { whatsappNumber: params.whatsappNumber },
            update: {
                wpUserId: params.wpUserId,
                wpStoreId: params.wpStoreId,
                storeName: params.storeName,
                storeUrl: params.storeUrl,
                verified: true,
                verifiedAt: new Date(),
            },
            create: {
                whatsappNumber: params.whatsappNumber,
                wpUserId: params.wpUserId,
                wpStoreId: params.wpStoreId,
                storeName: params.storeName,
                storeUrl: params.storeUrl,
                verified: true,
                verifiedAt: new Date(),
            },
        });

        // Also update the conversation record
        await prisma.conversation.updateMany({
            where: { whatsappNumber: params.whatsappNumber },
            data: {
                wpUserId: params.wpUserId,
                wpStoreId: params.wpStoreId,
            },
        });

        logger.info(`[Vendor] Linked ${params.whatsappNumber} to WP user ${params.wpUserId}`);
        return link;
    } catch (error) {
        logger.error('[Vendor] Failed to link vendor', { error, params });
        throw error;
    }
}

/**
 * Check if a WhatsApp number is linked to a verified vendor.
 */
export async function getVendorLink(whatsappNumber: string) {
    return prisma.vendorLink.findUnique({
        where: { whatsappNumber },
    });
}

export default {
    getOrCreateConversation,
    storeMessage,
    getConversationContext,
    logAction,
    linkVendor,
    getVendorLink,
};
