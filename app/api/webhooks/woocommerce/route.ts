/**
 * WooCommerce Webhooks API Route (LARA Agent - Order Orchestration)
 *
 * Receives webhooks from WooCommerce when:
 *   - Order created
 *   - Order status updated
 *   - Product created/updated
 *   - New vendor registered
 *
 * This is the heart of LARA — the MotherShip agent that orchestrates
 * order flow and keeps vendors + customers in the loop via WhatsApp.
 *
 * Setup in WordPress:
 *   WooCommerce → Settings → Advanced → Webhooks → Add Webhook
 *   Delivery URL: https://your-domain.com/api/webhooks/woocommerce
 *   Secret: (matches WOOCOMMERCE_WEBHOOK_SECRET env var)
 *   Topic: Order created / Order updated / etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendWhatsAppMessage } from '@/app/lib/twilio';
import { getVendorLink } from '@/app/lib/conversation';
import prisma from '@/app/lib/prisma';
import logger from '@/app/lib/logger';

// ============================================
// WEBHOOK SECRET VALIDATION
// ============================================

const WEBHOOK_SECRET = process.env.WOOCOMMERCE_WEBHOOK_SECRET || '';

function validateWebhookSignature(
    payload: string,
    signature: string
): boolean {
    if (!WEBHOOK_SECRET) {
        logger.warn('[WC Webhook] No webhook secret configured — skipping validation');
        return true; // Allow in dev without secret
    }

    const hash = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(payload, 'utf8')
        .digest('base64');

    return hash === signature;
}

// ============================================
// POST — Handle WooCommerce Webhook
// ============================================

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();
        const signature = request.headers.get('x-wc-webhook-signature') || '';
        const topic = request.headers.get('x-wc-webhook-topic') || '';
        const resource = request.headers.get('x-wc-webhook-resource') || '';

        // Validate signature in production
        if (process.env.NODE_ENV === 'production') {
            if (!validateWebhookSignature(rawBody, signature)) {
                logger.warn('[WC Webhook] Invalid signature', { topic });
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
        }

        const data = JSON.parse(rawBody);

        logger.info(`[WC Webhook] Received: ${topic}`, {
            resource,
            id: data.id,
        });

        // Route by topic
        switch (topic) {
            case 'order.created':
                await handleOrderCreated(data);
                break;
            case 'order.updated':
                await handleOrderUpdated(data);
                break;
            case 'product.created':
                await handleProductCreated(data);
                break;
            case 'product.updated':
                await handleProductUpdated(data);
                break;
            default:
                logger.info(`[WC Webhook] Unhandled topic: ${topic}`);
        }

        return NextResponse.json({ received: true, topic });
    } catch (error: any) {
        logger.error('[WC Webhook] Error processing webhook', {
            error: error.message,
            stack: error.stack,
        });
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}

// ============================================
// ORDER CREATED — LARA: Notify vendor + customer
// ============================================

async function handleOrderCreated(order: any) {
    const orderId = order.id;
    const orderNumber = order.number || orderId;
    const status = order.status;
    const total = order.total;
    const currency = order.currency || 'KES';
    const customerName = `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim();
    const customerPhone = order.billing?.phone;
    const items = order.line_items || [];

    logger.info(`[LARA] New order #${orderNumber}`, { total, status, items: items.length });

    // Build item list
    const itemList = items
        .map((item: any) => `• ${item.name} × ${item.quantity} — ${currency} ${item.total}`)
        .join('\n');

    // Find the vendor(s) for this order's products
    // In Dokan, each product has an author (vendor)
    const vendorIds = [...new Set(items.map((item: any) => item.vendor_id || item.product_id))];

    // Try to find vendor WhatsApp numbers from our VendorLink table
    const vendorLinks = await prisma.vendorLink.findMany({
        where: {
            wpUserId: { in: items.map((i: any) => i.vendor_id).filter(Boolean) },
        },
    });

    // Notify each linked vendor via WhatsApp
    for (const link of vendorLinks) {
        const vendorMessage = `🛒 *New Order!* #${orderNumber}

Hey ${link.storeName || 'MomBoss'}! You just got a new order! 🎉

👤 Customer: ${customerName}
💰 Total: ${currency} ${total}

*Items:*
${itemList}

📦 Please prepare this order for pickup/delivery.

Reply "order ${orderNumber}" for full details.`;

        await sendWhatsAppMessage(link.whatsappNumber, vendorMessage);

        logger.info(`[LARA] Notified vendor ${link.whatsappNumber} about order #${orderNumber}`);
    }

    // Notify customer if they have a WhatsApp number
    if (customerPhone) {
        const customerMessage = `✅ *Order Confirmed!* #${orderNumber}

Hi ${customerName}! 🎉

Your order from MomBoss has been confirmed!

*Items:*
${itemList}

💰 Total: ${currency} ${total}

We'll update you when your order is being prepared. Thank you for supporting women entrepreneurs! 🤱💼`;

        await sendWhatsAppMessage(customerPhone, customerMessage);

        logger.info(`[LARA] Notified customer ${customerPhone} about order #${orderNumber}`);
    }

    // Log the action
    await prisma.actionLog.create({
        data: {
            whatsappNumber: vendorLinks[0]?.whatsappNumber || 'system',
            action: 'order_notification',
            toolName: 'lara_order_created',
            input: { orderId, orderNumber },
            output: {
                vendorsNotified: vendorLinks.length,
                customerNotified: !!customerPhone,
            },
            success: true,
        },
    });
}

// ============================================
// ORDER UPDATED — LARA: Status change notifications
// ============================================

async function handleOrderUpdated(order: any) {
    const orderId = order.id;
    const orderNumber = order.number || orderId;
    const status = order.status;
    const customerPhone = order.billing?.phone;
    const customerName = `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim();

    const statusMessages: Record<string, string> = {
        processing: `📋 Order #${orderNumber} is now being *processed*! The vendor is preparing your items.`,
        'on-hold': `⏸️ Order #${orderNumber} is *on hold*. We'll update you when it resumes.`,
        completed: `🎉 Order #${orderNumber} is *complete*! Thank you for shopping on MomBoss, ${customerName}! We hope you love it! 💜`,
        cancelled: `❌ Order #${orderNumber} has been *cancelled*. If this was unexpected, please reach out to us.`,
        refunded: `💰 Order #${orderNumber} has been *refunded*. The refund will appear in your account shortly.`,
        failed: `⚠️ There was an issue with Order #${orderNumber}. Please check your payment method and try again.`,
    };

    const message = statusMessages[status];

    if (message && customerPhone) {
        await sendWhatsAppMessage(customerPhone, message);
        logger.info(`[LARA] Sent status update "${status}" to customer for order #${orderNumber}`);
    }

    // Also notify the vendor
    const items = order.line_items || [];
    const vendorLinks = await prisma.vendorLink.findMany({
        where: {
            wpUserId: { in: items.map((i: any) => i.vendor_id).filter(Boolean) },
        },
    });

    for (const link of vendorLinks) {
        if (status === 'completed') {
            await sendWhatsAppMessage(
                link.whatsappNumber,
                `✅ Order #${orderNumber} marked as *completed*! Great work, ${link.storeName}! 💪🎉`
            );
        } else if (status === 'cancelled' || status === 'refunded') {
            await sendWhatsAppMessage(
                link.whatsappNumber,
                `⚠️ Order #${orderNumber} has been *${status}*. Check your dashboard for details.`
            );
        }
    }
}

// ============================================
// PRODUCT CREATED — Notify vendor, offer advertising
// ============================================

async function handleProductCreated(product: any) {
    const productId = product.id;
    const productName = product.name;
    const vendorId = product.author || product.vendor_id;
    const price = product.regular_price;
    const status = product.status;

    if (!vendorId) return;

    const link = await prisma.vendorLink.findFirst({
        where: { wpUserId: vendorId },
    });

    if (link) {
        const message = `📦 *New Product Added!*

"${productName}" has been created ${status === 'draft' ? 'as a draft' : `and is ${status}`}.
${price ? `💰 Price: KES ${price}` : ''}

${status === 'draft' ? '📝 Remember to publish it when you\'re ready!' : ''}

💡 Want me to create a marketing ad for this product? Just say "advertise ${productName}"!`;

        await sendWhatsAppMessage(link.whatsappNumber, message);
        logger.info(`[LARA] Notified vendor about new product: ${productName}`);
    }
}

// ============================================
// PRODUCT UPDATED
// ============================================

async function handleProductUpdated(product: any) {
    // Only notify on significant changes (status change to publish)
    if (product.status === 'publish') {
        const vendorId = product.author || product.vendor_id;
        if (!vendorId) return;

        const link = await prisma.vendorLink.findFirst({
            where: { wpUserId: vendorId },
        });

        if (link) {
            await sendWhatsAppMessage(
                link.whatsappNumber,
                `🟢 Your product "${product.name}" is now *live* on MomBoss! 🎉\n\n🔗 ${product.permalink || 'Check your store to see it!'}`
            );
        }
    }
}

// ============================================
// GET — Webhook verification / info
// ============================================

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        service: 'MomBoss WooCommerce Webhook Handler (LARA)',
        description: 'Receives order and product events from WooCommerce',
        topics: ['order.created', 'order.updated', 'product.created', 'product.updated'],
        setup: 'Configure in WordPress: WooCommerce → Settings → Advanced → Webhooks',
    });
}
