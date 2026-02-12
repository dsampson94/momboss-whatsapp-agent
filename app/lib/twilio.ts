/**
 * Twilio WhatsApp Client
 *
 * Handles sending messages back to vendors on WhatsApp via Twilio.
 * Also provides webhook signature validation for security.
 *
 * In DEV MODE (no Twilio credentials), messages are logged to console
 * instead of sent. This lets you test the full pipeline locally.
 *
 * Docs: https://www.twilio.com/docs/whatsapp/api
 */

import twilio from 'twilio';
import logger from './logger';

// ============================================
// CONFIG
// ============================================

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

// Dev mode: if no Twilio credentials, log instead of sending
const DEV_MODE = !TWILIO_ACCOUNT_SID || TWILIO_ACCOUNT_SID.startsWith('AC_PLACEHOLDER') || !TWILIO_AUTH_TOKEN;

const client = DEV_MODE ? null : twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

if (DEV_MODE) {
    logger.warn('[Twilio] ⚠️  DEV MODE — No Twilio credentials. Messages will be logged, not sent.');
}

// ============================================
// SEND MESSAGES
// ============================================

/**
 * Send a WhatsApp text message to a vendor.
 * Twilio has a 1600 char limit per message — we split long messages.
 * In DEV MODE: logs the message instead of sending.
 */
export async function sendWhatsAppMessage(
    to: string,
    body: string
): Promise<{ success: boolean; messageSids?: string[]; error?: string }> {
    try {
        // Ensure "whatsapp:" prefix
        const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

        // DEV MODE: just log the message
        if (DEV_MODE || !client) {
            logger.info(`[Twilio][DEV] 📱 Would send to ${toNumber}:\n${body}`);
            return { success: true, messageSids: ['dev-mode-no-sid'] };
        }

        // Split long messages (Twilio limit ~1600 chars)
        const chunks = splitMessage(body, 1500);
        const sids: string[] = [];

        for (const chunk of chunks) {
            const message = await client.messages.create({
                from: TWILIO_WHATSAPP_NUMBER,
                to: toNumber,
                body: chunk,
            });
            sids.push(message.sid);
            logger.info(`[Twilio] Sent message ${message.sid} to ${toNumber}`);
        }

        return { success: true, messageSids: sids };
    } catch (error: any) {
        logger.error('[Twilio] Failed to send message', {
            to,
            error: error.message,
            code: error.code,
        });
        return { success: false, error: error.message };
    }
}

/**
 * Send a WhatsApp media message (image, document, etc.)
 * In DEV MODE: logs instead of sending.
 */
export async function sendWhatsAppMedia(
    to: string,
    mediaUrl: string,
    caption?: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    try {
        const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

        // DEV MODE: just log the media
        if (DEV_MODE || !client) {
            logger.info(`[Twilio][DEV] 📱🖼️ Would send media to ${toNumber}: ${mediaUrl} — ${caption || '(no caption)'}`);
            return { success: true, messageSid: 'dev-mode-no-sid' };
        }

        const message = await client.messages.create({
            from: TWILIO_WHATSAPP_NUMBER,
            to: toNumber,
            body: caption || '',
            mediaUrl: [mediaUrl],
        });

        logger.info(`[Twilio] Sent media message ${message.sid} to ${toNumber}`);
        return { success: true, messageSid: message.sid };
    } catch (error: any) {
        logger.error('[Twilio] Failed to send media message', {
            to,
            error: error.message,
        });
        return { success: false, error: error.message };
    }
}

// ============================================
// WEBHOOK VALIDATION
// ============================================

/**
 * Validate that an incoming request is genuinely from Twilio.
 * Uses the X-Twilio-Signature header + your auth token.
 */
export function validateTwilioSignature(
    signature: string,
    url: string,
    params: Record<string, string>
): boolean {
    try {
        return twilio.validateRequest(
            TWILIO_AUTH_TOKEN,
            signature,
            url,
            params
        );
    } catch (error) {
        logger.error('[Twilio] Signature validation failed', { error });
        return false;
    }
}

// ============================================
// HELPERS
// ============================================

/**
 * Split a long message into chunks, breaking at paragraph/sentence boundaries.
 */
function splitMessage(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) return [text];

    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
            chunks.push(remaining);
            break;
        }

        // Try to break at double newline (paragraph)
        let breakIdx = remaining.lastIndexOf('\n\n', maxLength);

        // Fall back to single newline
        if (breakIdx === -1 || breakIdx < maxLength * 0.3) {
            breakIdx = remaining.lastIndexOf('\n', maxLength);
        }

        // Fall back to sentence boundary
        if (breakIdx === -1 || breakIdx < maxLength * 0.3) {
            breakIdx = remaining.lastIndexOf('. ', maxLength);
            if (breakIdx !== -1) breakIdx += 1; // include the period
        }

        // Last resort: hard break
        if (breakIdx === -1 || breakIdx < maxLength * 0.3) {
            breakIdx = maxLength;
        }

        chunks.push(remaining.slice(0, breakIdx).trim());
        remaining = remaining.slice(breakIdx).trim();
    }

    return chunks;
}

/**
 * Parse the "From" field from Twilio webhook — strips "whatsapp:" prefix.
 */
export function parseWhatsAppNumber(from: string): string {
    return from.replace('whatsapp:', '');
}

export default {
    sendWhatsAppMessage,
    sendWhatsAppMedia,
    validateTwilioSignature,
    parseWhatsAppNumber,
};
