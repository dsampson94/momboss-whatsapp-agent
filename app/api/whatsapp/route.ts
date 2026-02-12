/**
 * WhatsApp Webhook API Route
 *
 * This is the endpoint Twilio hits when a message comes in on WhatsApp.
 *
 * POST /api/whatsapp — Incoming message handler
 * GET  /api/whatsapp — Webhook verification (Twilio health check)
 *
 * Flow:
 *   Twilio webhook → parse message → get/create conversation →
 *   store inbound message → run AI agent → store outbound message →
 *   send reply via Twilio
 */

import { NextRequest, NextResponse } from 'next/server';
import { processMessage } from '@/app/lib/agent';
import {
    getOrCreateConversation,
    storeMessage,
} from '@/app/lib/conversation';
import { parseWhatsAppNumber } from '@/app/lib/twilio';
import logger from '@/app/lib/logger';

// ============================================
// POST — Handle Incoming WhatsApp Message
// ============================================

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        // Parse the Twilio webhook payload (form-encoded)
        const formData = await request.formData();
        const body: Record<string, string> = {};
        formData.forEach((value, key) => {
            body[key] = value.toString();
        });

        // Skip signature validation for POC/sandbox mode

        // Extract message details from Twilio payload
        const from = body.From || '';           // "whatsapp:+27821234567"
        const messageBody = body.Body || '';     // The text message
        const profileName = body.ProfileName;    // WhatsApp display name
        const twilioSid = body.MessageSid;       // Twilio message SID
        const numMedia = parseInt(body.NumMedia || '0', 10);

        // Get media URL if present (vendor sent an image/doc)
        let mediaUrl: string | undefined;
        if (numMedia > 0) {
            mediaUrl = body.MediaUrl0;
        }

        const whatsappNumber = parseWhatsAppNumber(from);

        logger.info('[Webhook] Incoming message', {
            from: whatsappNumber,
            profileName,
            hasMedia: numMedia > 0,
            bodyLength: messageBody.length,
        });

        // Skip empty messages
        if (!messageBody && !mediaUrl) {
            logger.warn('[Webhook] Empty message received, ignoring');
            return new NextResponse('<Response></Response>', {
                status: 200,
                headers: { 'Content-Type': 'text/xml' },
            });
        }

        // 1. Get or create conversation
        const conversation = await getOrCreateConversation(whatsappNumber, profileName);

        // 2. Store the inbound message
        await storeMessage({
            conversationId: conversation.id,
            direction: 'INBOUND',
            senderType: 'USER',
            content: messageBody || null,
            contentType: mediaUrl ? 'IMAGE' : 'TEXT',
            mediaUrl,
            twilioSid,
        });

        // 3. Process through AI agent
        const agentResponse = await processMessage(
            whatsappNumber,
            messageBody,
            mediaUrl
        );

        // 4. Store the outbound message
        await storeMessage({
            conversationId: conversation.id,
            direction: 'OUTBOUND',
            senderType: 'AGENT',
            content: agentResponse.reply,
            toolCalls: agentResponse.toolCalls,
            tokensUsed: agentResponse.tokensUsed,
        });

        const duration = Date.now() - startTime;
        logger.info(`[Webhook] Processed in ${duration}ms`, {
            from: whatsappNumber,
            toolCalls: agentResponse.toolCalls?.length || 0,
        });

        // Reply directly via TwiML (no auth token needed)
        const escapedReply = agentResponse.reply
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return new NextResponse(
            `<Response><Message>${escapedReply}</Message></Response>`,
            { status: 200, headers: { 'Content-Type': 'text/xml' } }
        );
    } catch (error: any) {
        logger.error('[Webhook] Error processing message', {
            error: error.message,
            stack: error.stack,
        });

        // Still return 200 to Twilio so it doesn't retry
        return new NextResponse('<Response></Response>', {
            status: 200,
            headers: { 'Content-Type': 'text/xml' },
        });
    }
}

// ============================================
// GET — Webhook Verification / Health Check
// ============================================

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        service: 'MomBoss WhatsApp Agent',
        webhook: '/api/whatsapp',
        timestamp: new Date().toISOString(),
    });
}
