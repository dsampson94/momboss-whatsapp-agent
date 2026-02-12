/**
 * n8n Webhook Bridge API Route
 *
 * Allows n8n workflows to trigger actions through our agent system.
 * This is how n8n connects to MomBoss — n8n sends a webhook here,
 * and we route the action to the appropriate handler.
 *
 * n8n Setup:
 *   Use an HTTP Request node pointing to: https://your-domain.com/api/webhooks/n8n
 *   Include the N8N_WEBHOOK_SECRET in the x-n8n-secret header.
 *
 * Supported actions:
 *   - send_whatsapp: Send a WhatsApp message to a vendor/customer
 *   - notify_vendor: Send a notification to a vendor
 *   - run_agent: Run an AI agent response for a given message
 *   - log_action: Log an action to the ActionLog
 *   - health_check: Check system health
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/app/lib/twilio';
import { processMessage } from '@/app/lib/agent';
import prisma from '@/app/lib/prisma';
import logger from '@/app/lib/logger';

// ============================================
// AUTH
// ============================================

const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET || '';

function validateN8nRequest(request: NextRequest): boolean {
    if (!N8N_SECRET) return true; // Allow in dev without secret
    const secret = request.headers.get('x-n8n-secret') || '';
    return secret === N8N_SECRET;
}

// ============================================
// POST — Handle n8n Webhook
// ============================================

export async function POST(request: NextRequest) {
    try {
        if (!validateN8nRequest(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { action, ...params } = body;

        logger.info(`[n8n Bridge] Received action: ${action}`, { params: Object.keys(params) });

        switch (action) {
            // ------------------------------------------
            // Send a WhatsApp message directly
            // ------------------------------------------
            case 'send_whatsapp': {
                const { to, message } = params;
                if (!to || !message) {
                    return NextResponse.json(
                        { error: 'Missing "to" and "message" fields' },
                        { status: 400 }
                    );
                }
                const result = await sendWhatsAppMessage(to, message);
                return NextResponse.json(result);
            }

            // ------------------------------------------
            // Notify a vendor by store ID or WhatsApp number
            // ------------------------------------------
            case 'notify_vendor': {
                const { vendor_id, whatsapp_number, message } = params;
                if (!message) {
                    return NextResponse.json({ error: 'Missing "message"' }, { status: 400 });
                }

                let targetNumber = whatsapp_number;

                // Look up by vendor ID if no WhatsApp number provided
                if (!targetNumber && vendor_id) {
                    const link = await prisma.vendorLink.findFirst({
                        where: { wpUserId: vendor_id },
                    });
                    if (link) targetNumber = link.whatsappNumber;
                }

                if (!targetNumber) {
                    return NextResponse.json(
                        { error: 'Could not find WhatsApp number for vendor' },
                        { status: 404 }
                    );
                }

                const result = await sendWhatsAppMessage(targetNumber, message);
                return NextResponse.json(result);
            }

            // ------------------------------------------
            // Run the AI agent as if a vendor sent a message
            // (useful for n8n to trigger AI-generated responses)
            // ------------------------------------------
            case 'run_agent': {
                const { whatsapp_number, message: userMessage } = params;
                if (!whatsapp_number || !userMessage) {
                    return NextResponse.json(
                        { error: 'Missing "whatsapp_number" and "message"' },
                        { status: 400 }
                    );
                }

                const agentResponse = await processMessage(whatsapp_number, userMessage);

                // Optionally auto-send the reply
                if (params.auto_send !== false) {
                    await sendWhatsAppMessage(whatsapp_number, agentResponse.reply);
                }

                return NextResponse.json({
                    success: true,
                    reply: agentResponse.reply,
                    toolCalls: agentResponse.toolCalls,
                    tokensUsed: agentResponse.tokensUsed,
                });
            }

            // ------------------------------------------
            // Log an action from n8n
            // ------------------------------------------
            case 'log_action': {
                const { whatsapp_number, action_name, tool_name, input, output, success } = params;
                await prisma.actionLog.create({
                    data: {
                        whatsappNumber: whatsapp_number || 'n8n',
                        action: action_name || 'n8n_action',
                        toolName: tool_name || 'n8n',
                        input: input || null,
                        output: output || null,
                        success: success !== false,
                    },
                });
                return NextResponse.json({ success: true, logged: true });
            }

            // ------------------------------------------
            // Broadcast a message to all verified vendors
            // ------------------------------------------
            case 'broadcast': {
                const { message } = params;
                if (!message) {
                    return NextResponse.json({ error: 'Missing "message"' }, { status: 400 });
                }

                const vendors = await prisma.vendorLink.findMany({
                    where: { verified: true },
                });

                let sent = 0;
                let failed = 0;

                for (const vendor of vendors) {
                    const result = await sendWhatsAppMessage(vendor.whatsappNumber, message);
                    if (result.success) sent++;
                    else failed++;
                }

                return NextResponse.json({
                    success: true,
                    totalVendors: vendors.length,
                    sent,
                    failed,
                });
            }

            // ------------------------------------------
            // Health check
            // ------------------------------------------
            case 'health_check': {
                return NextResponse.json({
                    status: 'ok',
                    service: 'MomBoss Agent n8n Bridge',
                    timestamp: new Date().toISOString(),
                });
            }

            default:
                return NextResponse.json(
                    { error: `Unknown action: ${action}` },
                    { status: 400 }
                );
        }
    } catch (error: any) {
        logger.error('[n8n Bridge] Error', { error: error.message });
        return NextResponse.json(
            { error: 'Failed to process n8n webhook', details: error.message },
            { status: 500 }
        );
    }
}

// ============================================
// GET — Info
// ============================================

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        service: 'MomBoss n8n Webhook Bridge',
        description: 'Allows n8n workflows to interact with the MomBoss AI agent system',
        actions: [
            'send_whatsapp - Send a WhatsApp message',
            'notify_vendor - Notify a vendor by ID or number',
            'run_agent - Run AI agent for a message',
            'log_action - Log an action',
            'broadcast - Message all verified vendors',
            'health_check - System health check',
        ],
        auth: 'Include x-n8n-secret header with N8N_WEBHOOK_SECRET value',
    });
}
