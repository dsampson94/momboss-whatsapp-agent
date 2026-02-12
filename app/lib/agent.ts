/**
 * MomBoss AI Agent Engine
 *
 * This is the BRAIN of the operation. It takes an incoming WhatsApp message,
 * builds context, sends it to GPT with tool definitions, executes any tool
 * calls GPT makes, and returns the final response.
 *
 * Flow:
 *   1. Receive message → build conversation context
 *   2. Send to GPT with system prompt + tools
 *   3. If GPT calls tools → execute them → send results back to GPT
 *   4. Get final text response → return it
 */

import OpenAI from 'openai';
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

const openai = new OpenAI({
    apiKey: (process.env.OPENAI_API_KEY || '').trim(),
});

const MODEL = (process.env.OPENAI_MODEL || 'gpt-4o').trim();
const MAX_TOKENS = 512;
const MAX_TOOL_ROUNDS = 3; // Safety limit: max tool-call rounds per message

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

    return `You are the MomBoss AI Agent — an AI assistant for women entrepreneurs on momboss.space.

You help vendors manage their online stores via WhatsApp. You combine the roles of:
- LARA: Order management and delivery tracking
- AMY: Marketing and ad generation
- MIRA: Business insights and pricing advice
- STEVE: Tech support and troubleshooting
- LULU: Event creation and management
- ZURI: Travel deals (coming soon)

Platform: MomBoss (momboss.space) — women-focused multi-vendor marketplace.
Stack: WordPress + WooCommerce + Dokan Pro
Market: Kenya. Currency: KES. Payments: M-Pesa, PayPal.

${vendorInfo}

STYLE: Keep replies SHORT (under 300 chars when possible). Be warm but concise — this is WhatsApp. Use bullet points. Kenyan-friendly English.

RULES:
1. Confirm before creating/updating anything
2. Products default to DRAFT
3. Prices in KES
4. Unverified vendors: help them link account first
5. Be honest if you don't know something
6. Double-confirm sensitive operations

ACTIONS:
- Products: Create, list, view, update
- Orders: List, view, update status
- Categories: Browse categories
- Store: View profile and stats
- Events: Create workshops and events
- Advertising: Generate marketing copy
- Insights: Business advice and trends
- Support: Platform help
- Verification: Link WhatsApp to vendor store

First message? Welcome them briefly and ask to link their store. Already verified? Greet by name, ask how to help.`;
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

        // 2. Build the messages array for OpenAI
        const systemPrompt = buildSystemPrompt(context);

        // Start with system message, then conversation history, then the new message
        const messages: OpenAI.ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt },
            ...context.messageHistory.map((msg: any) => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content as string,
            })),
        ];

        // Add the current user message
        let currentMessageContent = userMessage;
        if (mediaUrl) {
            currentMessageContent += `\n\n[The vendor sent an image/file: ${mediaUrl}]`;
        }
        messages.push({ role: 'user', content: currentMessageContent });

        // 3. Call GPT in a tool-use loop
        const allToolCalls: Array<{ name: string; input: any; result: any }> = [];
        let totalTokens = 0;
        let finalReply = '';
        let rounds = 0;

        while (rounds < MAX_TOOL_ROUNDS) {
            rounds++;

            const response = await openai.chat.completions.create({
                model: MODEL,
                max_tokens: MAX_TOKENS,
                messages,
                tools: agentTools,
                tool_choice: 'auto',
            });

            const choice = response.choices[0];
            const assistantMessage = choice.message;

            totalTokens += (response.usage?.total_tokens || 0);

            // Collect text content if present
            if (assistantMessage.content) {
                finalReply = assistantMessage.content.trim();
            }

            // Check if GPT wants to use tools
            const toolCallsInResponse = assistantMessage.tool_calls || [];

            // If no tool calls, we're done!
            if (toolCallsInResponse.length === 0 || choice.finish_reason === 'stop') {
                if (!finalReply) {
                    finalReply = "I'm here to help! What can I do for you today?";
                }
                break;
            }

            // Add assistant message (with tool_calls) to messages
            messages.push(assistantMessage);

            // Execute each tool call and add results
            for (const toolCall of toolCallsInResponse) {
                if (toolCall.type !== 'function') continue;
                const toolName = toolCall.function.name;
                let toolInput: Record<string, any> = {};

                try {
                    toolInput = JSON.parse(toolCall.function.arguments);
                } catch {
                    toolInput = {};
                }

                const toolStartTime = Date.now();
                logger.info(`[Agent] Executing tool: ${toolName}`, { input: toolInput });

                try {
                    const result = await executeTool(toolName, toolInput, context);
                    const duration = Date.now() - toolStartTime;

                    allToolCalls.push({
                        name: toolName,
                        input: toolInput,
                        result,
                    });

                    // Log the action
                    await logAction({
                        whatsappNumber,
                        action: toolName,
                        toolName,
                        input: toolInput,
                        output: result,
                        success: result?.success !== false,
                        errorMessage: result?.error,
                        durationMs: duration,
                    });

                    // Add tool result to messages
                    messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(result),
                    });
                } catch (error: any) {
                    const duration = Date.now() - toolStartTime;
                    logger.error(`[Agent] Tool execution failed: ${toolName}`, { error });

                    await logAction({
                        whatsappNumber,
                        action: toolName,
                        toolName,
                        input: toolInput,
                        success: false,
                        errorMessage: error.message,
                        durationMs: duration,
                    });

                    messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify({ success: false, error: error.message }),
                    });
                }
            }
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
            reply: "Sorry, I ran into a problem. Please try again in a moment.",
        };
    }
}

export default { processMessage };
