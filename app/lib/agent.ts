/**
 * MomBoss AI Agent Engine
 *
 * This is the BRAIN of the operation. It takes an incoming WhatsApp message,
 * builds context, sends it to Claude with tool definitions, executes any tool
 * calls Claude makes, and returns the final response.
 *
 * Flow:
 *   1. Receive message → build conversation context
 *   2. Send to Claude with system prompt + tools
 *   3. If Claude calls tools → execute them → send results back to Claude
 *   4. Get final text response → return it
 */

import Anthropic from '@anthropic-ai/sdk';
import logger from './logger';
import { agentTools } from './tools';
import {
    getConversationContext,
    logAction,
    type ConversationContext,
} from './conversation';
import { executeTool } from './tool-executor';

// ============================================
// CONFIG
// ============================================

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1024;
const MAX_TOOL_ROUNDS = 5; // Safety limit: max tool-call rounds per message

// ============================================
// SYSTEM PROMPT
// ============================================

function buildSystemPrompt(context: ConversationContext): string {
    const vendorInfo = context.isVerified
        ? `
VENDOR STATUS: ✅ Verified & Linked
Vendor Name: ${context.vendorName || 'Unknown'}
WordPress User ID: ${context.wpUserId}
Dokan Store ID: ${context.wpStoreId || 'Not linked'}
You can perform store actions for this vendor.
`
        : `
VENDOR STATUS: ❌ Not yet verified
This vendor has NOT linked their WhatsApp to their MomBoss store.
Before doing any store actions, help them verify by asking for their store email or store ID.
Use the verify_vendor tool once they provide this information.
You can still answer general questions and explain what MomBoss offers.
`;

    return `You are the MomBoss AI Agent Network 🤱💼 — a team of AI-powered assistants for women entrepreneurs on the MomBoss marketplace (momboss.space).

You operate as a unified WhatsApp interface that combines the capabilities of our agent team:
• 🚀 LARA (The MotherShip) — Order orchestration, notifications, and delivery tracking
• 🎨 AMY (Marketing Wizard) — Product advertising and marketing materials
• 📊 MIRA (The Co-Founder) — Business intelligence, trends, and pricing advice
• 🔧 STEVE (Tech Support) — Platform help, troubleshooting, and self-healing
• 📅 LULU (Event Manager) — Event creation, ticketing, and vendor participation
• ✈️ ZURI (Travel Concierge) — Travel deals via MB-BNB.com (coming soon)

PLATFORM: MomBoss (momboss.space) — Africa's first women-focused AI-powered multi-vendor marketplace.
POWERED BY: WordPress + WooCommerce + Dokan Pro
PRIMARY MARKET: Kenya 🇰🇪
CURRENCY: Kenyan Shilling (KES) — format prices as "KES 500" or "KES 1,200"
PAYMENTS: M-Pesa (primary), PayPal (international)

${vendorInfo}

COMMUNICATION STYLE:
- Be warm, supportive, and empowering — these are busy moms running businesses! 💪
- Use emojis naturally (you're on WhatsApp after all) but don't overdo it
- Keep messages concise — WhatsApp isn't the place for essays
- Use bullet points and short paragraphs for readability
- Speak encouraging Kenyan-friendly English — be relatable
- Celebrate their wins! When a product is created or an order comes in, be genuinely excited 🎉
- If something goes wrong, be honest and helpful

IMPORTANT RULES:
1. ALWAYS confirm details before creating/updating anything. Summarize what you'll do and ask "Should I go ahead?"
2. Products default to DRAFT status — tell the vendor they can publish when ready
3. Prices are in KES — format as "KES 500" (e.g. "KES 800", "KES 1,200")
4. If a vendor is not verified, help them link their account FIRST before doing store actions
5. If you don't know something, say so honestly — don't make things up
6. For sensitive operations (deleting products, cancelling orders), double-confirm
7. If the message contains an image URL, the vendor likely sent a product photo — ask if they want to use it
8. When talking about advertising, explain that AMY can create Facebook, Instagram, and WhatsApp ads
9. For business advice, channel MIRA — give data-driven, actionable suggestions
10. For tech problems, channel STEVE — diagnose and fix or escalate clearly

AVAILABLE ACTIONS:
📦 Products: Create, list, view, update (name, price, stock, status, images)
🛒 Orders: List, view details, update status, send notifications
📁 Categories: Browse product categories
🏪 Store: View store profile, sales stats, dashboard
📅 Events: Create events/workshops (virtual, hybrid, in-person)
📣 Advertising: Generate marketing copy for products
📊 Insights: Business tips, trending products, pricing advice
🔧 Support: Help with platform issues, guides, troubleshooting
✅ Verification: Link WhatsApp number to Dokan vendor store

FIRST-TIME GREETING:
When a vendor says hi for the first time, welcome them warmly:
"Welcome to MomBoss! 🤱💼 I'm your AI assistant team — I can help you manage your store, create products, track orders, advertise, and so much more. All right here on WhatsApp! Let's start by linking your store. What's your store email or store ID?"

If they're already verified, greet them by name and ask how you can help today.`;
}

// ============================================
// PROCESS MESSAGE (MAIN ENTRY POINT)
// ============================================

export interface AgentResponse {
    reply: string;
    toolCalls?: Array<{ name: string; input: any; result: any }>;
    tokensUsed?: number;
}

/**
 * Process an incoming message through the AI agent.
 * This is the main entry point — called by the webhook handler.
 */
export async function processMessage(
    whatsappNumber: string,
    userMessage: string,
    mediaUrl?: string
): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
        // 1. Get conversation context
        const context = await getConversationContext(whatsappNumber);

        // 2. Build the messages array for Claude
        const systemPrompt = buildSystemPrompt(context);

        // Start with conversation history, then add the new message
        const messages: Anthropic.MessageParam[] = [
            ...context.messageHistory,
        ];

        // Add the current user message
        let currentMessageContent = userMessage;
        if (mediaUrl) {
            currentMessageContent += `\n\n[The vendor sent an image/file: ${mediaUrl}]`;
        }
        messages.push({ role: 'user', content: currentMessageContent });

        // 3. Call Claude in a tool-use loop
        const allToolCalls: Array<{ name: string; input: any; result: any }> = [];
        let totalTokens = 0;
        let finalReply = '';
        let rounds = 0;

        while (rounds < MAX_TOOL_ROUNDS) {
            rounds++;

            const response = await anthropic.messages.create({
                model: MODEL,
                max_tokens: MAX_TOKENS,
                system: systemPrompt,
                tools: agentTools,
                messages,
            });

            totalTokens += (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

            // Check if Claude wants to use tools
            const toolUseBlocks = response.content.filter(
                (block) => block.type === 'tool_use'
            );

            const textBlocks = response.content.filter(
                (block) => block.type === 'text'
            );

            // If there are text blocks, collect them
            if (textBlocks.length > 0) {
                finalReply = textBlocks
                    .map((b) => (b.type === 'text' ? b.text : ''))
                    .join('\n')
                    .trim();
            }

            // If no tool calls, we're done!
            if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
                // If Claude stopped without text (unlikely), provide a fallback
                if (!finalReply) {
                    finalReply = "I'm here to help! What can I do for you today? 😊";
                }
                break;
            }

            // Execute tool calls
            // Add assistant's full response to messages
            messages.push({ role: 'assistant', content: response.content });

            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const toolBlock of toolUseBlocks) {
                if (toolBlock.type !== 'tool_use') continue;

                const toolStartTime = Date.now();
                logger.info(`[Agent] Executing tool: ${toolBlock.name}`, { input: toolBlock.input });

                try {
                    const result = await executeTool(
                        toolBlock.name,
                        toolBlock.input as Record<string, any>,
                        context
                    );

                    const duration = Date.now() - toolStartTime;

                    allToolCalls.push({
                        name: toolBlock.name,
                        input: toolBlock.input,
                        result,
                    });

                    // Log the action
                    await logAction({
                        whatsappNumber,
                        action: toolBlock.name,
                        toolName: toolBlock.name,
                        input: toolBlock.input,
                        output: result,
                        success: result?.success !== false,
                        errorMessage: result?.error,
                        durationMs: duration,
                    });

                    toolResults.push({
                        type: 'tool_result',
                        tool_use_id: toolBlock.id,
                        content: JSON.stringify(result),
                    });
                } catch (error: any) {
                    const duration = Date.now() - toolStartTime;
                    logger.error(`[Agent] Tool execution failed: ${toolBlock.name}`, { error });

                    await logAction({
                        whatsappNumber,
                        action: toolBlock.name,
                        toolName: toolBlock.name,
                        input: toolBlock.input,
                        success: false,
                        errorMessage: error.message,
                        durationMs: duration,
                    });

                    toolResults.push({
                        type: 'tool_result',
                        tool_use_id: toolBlock.id,
                        content: JSON.stringify({ success: false, error: error.message }),
                        is_error: true,
                    });
                }
            }

            // Send tool results back to Claude
            messages.push({ role: 'user', content: toolResults });
        }

        const totalDuration = Date.now() - startTime;
        logger.info(`[Agent] Processed message in ${totalDuration}ms (${rounds} rounds, ${totalTokens} tokens)`, {
            whatsappNumber,
            toolCalls: allToolCalls.length,
        });

        return {
            reply: finalReply,
            toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
            tokensUsed: totalTokens,
        };
    } catch (error: any) {
        logger.error('[Agent] Failed to process message', {
            error: error.message,
            whatsappNumber,
        });

        return {
            reply: "I'm sorry, I ran into a problem processing your message. Please try again in a moment! 🙏",
        };
    }
}

export default { processMessage };
