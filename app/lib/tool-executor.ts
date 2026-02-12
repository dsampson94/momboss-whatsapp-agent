/**
 * Tool Executor
 *
 * Maps Claude's tool calls to actual WordPress/WooCommerce/Dokan API functions.
 * This is the bridge between "Claude wants to call create_product" and
 * actually calling the WordPress API.
 */

import * as wp from './wordpress';
import { linkVendor, type ConversationContext } from './conversation';
import logger from './logger';

// ============================================
// EXECUTE A TOOL CALL
// ============================================

/**
 * Execute a tool by name with given input parameters.
 * Returns the result that gets sent back to Claude.
 */
export async function executeTool(
    toolName: string,
    input: Record<string, any>,
    context: ConversationContext
): Promise<any> {
    switch (toolName) {
        // ------------------------------------------
        // PRODUCTS
        // ------------------------------------------
        case 'create_product':
            return wp.createProduct({
                name: input.name,
                description: input.description,
                short_description: input.short_description,
                regular_price: input.regular_price,
                sale_price: input.sale_price,
                categories: input.categories,
                images: input.images,
                status: input.status || 'draft',
                sku: input.sku,
                manage_stock: input.manage_stock,
                stock_quantity: input.stock_quantity,
            });

        case 'list_products':
            return wp.listProducts({
                vendor_id: context.wpUserId || undefined,
                search: input.search,
                status: input.status,
                per_page: input.per_page,
                page: input.page,
            });

        case 'get_product':
            return wp.getProduct(input.product_id);

        case 'update_product': {
            const { product_id, ...updates } = input;
            return wp.updateProduct(product_id, updates);
        }

        // ------------------------------------------
        // ORDERS
        // ------------------------------------------
        case 'list_orders':
            return wp.listOrders({
                vendor_id: context.wpUserId || undefined,
                status: input.status,
                per_page: input.per_page,
                page: input.page,
            });

        case 'get_order':
            return wp.getOrder(input.order_id);

        case 'update_order_status':
            return wp.updateOrderStatus(input.order_id, input.status);

        // ------------------------------------------
        // CATEGORIES
        // ------------------------------------------
        case 'list_categories':
            return wp.listCategories({
                per_page: input.per_page,
            });

        // ------------------------------------------
        // VENDOR / STORE
        // ------------------------------------------
        case 'get_vendor_info': {
            const vendorId = input.vendor_id || context.wpStoreId;
            if (!vendorId) {
                return {
                    success: false,
                    error: 'No vendor ID available. The vendor needs to verify their account first.',
                };
            }
            return wp.getVendor(vendorId);
        }

        case 'get_vendor_stats': {
            const vendorId = input.vendor_id || context.wpStoreId;
            if (!vendorId) {
                return {
                    success: false,
                    error: 'No vendor ID available. The vendor needs to verify their account first.',
                };
            }
            return wp.getVendorDashboardStats(vendorId);
        }

        // ------------------------------------------
        // EVENTS
        // ------------------------------------------
        case 'create_event':
            return wp.createEvent({
                title: input.title,
                description: input.description,
                start_date: input.start_date,
                end_date: input.end_date,
                venue: input.venue,
                type: input.type,
                ticket_price: input.ticket_price,
                status: input.status,
            });

        // ------------------------------------------
        // VERIFICATION
        // ------------------------------------------
        case 'verify_vendor':
            return handleVerifyVendor(input, context);

        // ------------------------------------------
        // AMY — MARKETING & ADVERTISING
        // ------------------------------------------
        case 'generate_ad_copy':
            return handleGenerateAdCopy(input, context);

        // ------------------------------------------
        // MIRA — BUSINESS INTELLIGENCE
        // ------------------------------------------
        case 'get_business_insights':
            return handleBusinessInsights(input, context);

        // ------------------------------------------
        // HELP
        // ------------------------------------------
        case 'get_help':
            return getHelpText(input.topic);

        default:
            logger.warn(`[ToolExecutor] Unknown tool: ${toolName}`);
            return {
                success: false,
                error: `Unknown tool: ${toolName}`,
            };
    }
}

// ============================================
// VERIFICATION HANDLER
// ============================================

async function handleVerifyVendor(
    input: Record<string, any>,
    context: ConversationContext
): Promise<any> {
    try {
        // Strategy 1: Look up by store ID
        if (input.store_id) {
            const vendorResult = await wp.getVendor(input.store_id);
            if (vendorResult.success && vendorResult.vendor) {
                const vendor = vendorResult.vendor;
                // Link the vendor
                await linkVendor({
                    whatsappNumber: context.whatsappNumber,
                    wpUserId: vendor.id,
                    wpStoreId: vendor.id,
                    storeName: vendor.store_name,
                });

                return {
                    success: true,
                    verified: true,
                    vendor: {
                        store_name: vendor.store_name,
                        store_id: vendor.id,
                    },
                    message: `Successfully linked to store "${vendor.store_name}"!`,
                };
            }
            return {
                success: false,
                error: 'Could not find a store with that ID. Please double-check and try again.',
            };
        }

        // Strategy 2: Look up by email — search through vendors
        if (input.store_email) {
            const vendorsResult = await wp.listVendors({ per_page: 100 });
            if (vendorsResult.success) {
                const match = vendorsResult.vendors.find(
                    (v: any) => v.email?.toLowerCase() === input.store_email.toLowerCase()
                );

                if (match) {
                    await linkVendor({
                        whatsappNumber: context.whatsappNumber,
                        wpUserId: match.id,
                        wpStoreId: match.id,
                        storeName: match.store_name,
                    });

                    return {
                        success: true,
                        verified: true,
                        vendor: {
                            store_name: match.store_name,
                            store_id: match.id,
                        },
                        message: `Successfully linked to store "${match.store_name}"!`,
                    };
                }

                return {
                    success: false,
                    error: 'Could not find a store with that email address. Please check and try again, or provide your store ID instead.',
                };
            }
        }

        return {
            success: false,
            error: 'Please provide either your store email or store ID so I can verify your account.',
        };
    } catch (error: any) {
        logger.error('[ToolExecutor] Verification failed', { error });
        return {
            success: false,
            error: `Verification failed: ${error.message}`,
        };
    }
}

// ============================================
// AMY — AD COPY GENERATOR
// ============================================

async function handleGenerateAdCopy(
    input: Record<string, any>,
    context: ConversationContext
): Promise<any> {
    try {
        // If product_id is provided, pull details from WooCommerce
        let productData = {
            name: input.product_name,
            description: input.product_description || '',
            price: input.price || '',
        };

        if (input.product_id) {
            const product = await wp.getProduct(input.product_id);
            if (product.success && product.product) {
                productData = {
                    name: product.product.name,
                    description: product.product.description || '',
                    price: product.product.price || '',
                };
            }
        }

        const audience = input.target_audience || 'women entrepreneurs in Kenya';
        const tone = input.tone || 'fun';

        // Generate 3 ad formats
        const adCopy = {
            facebook: `🎉 ${productData.name}\n\n${productData.description ? productData.description + '\n\n' : ''}${productData.price ? '💰 Only KES ' + productData.price + '!\n\n' : ''}🛒 Shop now on MomBoss → momboss.space\n\n#MomBoss #WomenInBusiness #Kenya #ShopLocal`,

            instagram: `✨ ${productData.name} ✨\n\n${productData.description || 'Made with love by a MomBoss 💜'}\n${productData.price ? '\n💰 KES ' + productData.price : ''}\n\n🔗 Link in bio\n\n#MomBoss #MomBossKenya #SupportWomen #ShopSmall #KenyanBusiness #WomenEntrepreneurs`,

            whatsapp: `Hey! 👋 Check out *${productData.name}* on MomBoss!\n\n${productData.description || ''}\n${productData.price ? '💰 Price: KES ' + productData.price : ''}\n\n🛒 Order now: momboss.space\n\nSupport a MomBoss today! 🤱💼`,
        };

        return {
            success: true,
            agent: 'AMY',
            product: productData.name,
            ad_copy: adCopy,
            tip: 'Send the Facebook version to the MomBoss Facebook group for maximum reach!',
            note: 'Visual ad design (Canva integration) coming soon! For now, pair this copy with a great product photo.',
        };
    } catch (error: any) {
        logger.error('[AMY] Ad copy generation failed', { error });
        return { success: false, error: `Failed to generate ad copy: ${error.message}` };
    }
}

// ============================================
// MIRA — BUSINESS INTELLIGENCE
// ============================================

async function handleBusinessInsights(
    input: Record<string, any>,
    context: ConversationContext
): Promise<any> {
    const vendorId = input.vendor_id || context.wpStoreId;

    try {
        switch (input.insight_type) {
            case 'sales_summary': {
                if (!vendorId) {
                    return { success: false, error: 'Vendor not verified. Link your store first!' };
                }
                const stats = await wp.getVendorDashboardStats(vendorId);
                const orders = await wp.listOrders({ vendor_id: vendorId, per_page: 20 });
                return {
                    success: true,
                    agent: 'MIRA',
                    insights: {
                        ...stats,
                        recent_orders: orders.success ? orders.count : 0,
                        tip: 'To boost sales, try posting a product ad to the MomBoss Facebook group!',
                    },
                };
            }

            case 'product_recommendations':
                return {
                    success: true,
                    agent: 'MIRA',
                    recommendations: [
                        '🍰 Homemade baked goods — consistently high demand in Kenya',
                        '🧴 Natural beauty products — organic/handmade is trending',
                        '👶 Baby products — always in demand from the MomBoss community',
                        '🎨 Custom crafts — personalized items have high margins',
                        '📱 Digital products — courses, templates, guides (no shipping!)',
                    ],
                    tip: 'Start with what you know and love. Your passion comes through in your products!',
                    data_note: 'Full Google Trends integration coming soon for real-time Kenyan market data.',
                };

            case 'pricing_advice': {
                if (!vendorId) {
                    return { success: false, error: 'Vendor not verified. Link your store first!' };
                }
                const products = await wp.listProducts({ vendor_id: vendorId });
                return {
                    success: true,
                    agent: 'MIRA',
                    pricing: {
                        your_products: products.success ? products.products : [],
                        advice: [
                            'Price competitively — check similar products on the platform',
                            'Consider offering bundle deals (e.g., buy 3 get 10% off)',
                            'Use sale prices strategically during holidays and events',
                            'Factor in M-Pesa fees and delivery costs into your pricing',
                        ],
                    },
                };
            }

            case 'marketing_tips':
                return {
                    success: true,
                    agent: 'MIRA',
                    tips: [
                        '📸 Use high-quality photos — natural light works best',
                        '📝 Write clear descriptions — include size, ingredients, materials',
                        '📱 Post to the MomBoss Facebook group (50K members!)',
                        '🕕 Best posting times: 6-8 AM and 6-9 PM (when moms browse)',
                        '💬 Respond to customer questions quickly — speed wins sales',
                        '🏷️ Use sale prices during holidays (Valentine\'s, Mother\'s Day, Black Friday)',
                        '🔄 Repost your best sellers every 2 weeks',
                    ],
                };

            case 'weekly_report': {
                if (!vendorId) {
                    return { success: false, error: 'Vendor not verified. Link your store first!' };
                }
                const [statsResult, ordersResult, productsResult] = await Promise.all([
                    wp.getVendorDashboardStats(vendorId),
                    wp.listOrders({ vendor_id: vendorId, per_page: 50 }),
                    wp.listProducts({ vendor_id: vendorId }),
                ]);

                return {
                    success: true,
                    agent: 'MIRA',
                    weekly_report: {
                        stats: statsResult.success ? statsResult.stats : null,
                        total_orders: ordersResult.success ? ordersResult.count : 0,
                        total_products: productsResult.success ? productsResult.count : 0,
                        actions: [
                            'Review your top-selling products and make sure they\'re in stock',
                            'Consider creating an ad for your best product',
                            'Reply to any pending customer questions',
                        ],
                    },
                };
            }

            default:
                return {
                    success: false,
                    error: `Unknown insight type: ${input.insight_type}`,
                };
        }
    } catch (error: any) {
        logger.error('[MIRA] Business insights failed', { error });
        return { success: false, error: `Failed to get insights: ${error.message}` };
    }
}

// ============================================
// HELP TEXT
// ============================================

function getHelpText(topic?: string): any {
    const helpTopics: Record<string, string> = {
        general: `
Here's what I can help you with on MomBoss! 🤱💼

📦 *Products* — Create, view, update, and manage your listings
🛒 *Orders* — Check orders, view details, update status
🏪 *Store* — View your store profile and sales stats
📅 *Events* — Create workshops, meetups, and webinars
📣 *Advertising* — Generate marketing ads for your products (AMY)
📊 *Insights* — Business advice, trends, and pricing tips (MIRA)
🔧 *Support* — Help with platform issues (STEVE)
✅ *Account* — Link your WhatsApp to your MomBoss store

Just tell me what you need! For example:
• "Add a new product"
• "Show me my recent orders"
• "How is my store doing?"
• "Advertise my chocolate cake"
• "What products should I sell?"
• "Create an event for next month"
        `.trim(),

        products: `
📦 *Product Management*

I can help you:
• *Create a product* — Tell me the name and price (in KES), I'll handle the rest
• *List products* — See all your products or search by name
• *Update a product* — Change price, description, stock, or status
• *Check stock* — See what's in stock and what's running low

Tips:
• Send me a photo and I can use it as the product image! 📸
• Products are created as drafts so you can review before publishing
• Say "publish product #123" to make it live
        `.trim(),

        orders: `
🛒 *Order Management*

I can help you:
• *View orders* — See recent orders or filter by status
• *Order details* — Get full info on a specific order
• *Update status* — Mark orders as processing, completed, etc.

Order flow: pending → processing → completed
Other statuses: on-hold, cancelled, refunded

💡 You'll also get automatic WhatsApp notifications when new orders come in!
        `.trim(),

        store: `
🏪 *Store Info*

I can help you:
• *Store profile* — View your Dokan store details
• *Sales stats* — See your total orders and revenue in KES
• *Store rating* — Check your store's customer rating

Just ask "How is my store doing?" and I'll pull up your dashboard!
        `.trim(),

        events: `
📅 *Events (LULU Agent)*

I can help you create events on MomBoss:
• Workshops, meetups, webinars, and more
• Virtual, hybrid, or in-person events
• Set date, time, venue, and ticket price (in KES)
• Events are created as drafts by default

Just say "Create an event" and I'll guide you through it!
        `.trim(),

        advertising: `
📣 *Advertising (AMY Agent)*

AMY can create professional marketing copy for your products:
• *Facebook post* — Optimized for the MomBoss group (50K members!)
• *Instagram story* — With hashtags and call-to-action
• *WhatsApp status* — Share with your contacts

Just say "Advertise [product name]" or "Promote my [product]"!

💡 First 10 ads per month are FREE with your vendor subscription.
        `.trim(),

        insights: `
📊 *Business Insights (MIRA Agent)*

MIRA is your personal business advisor:
• *Sales summary* — How your store is performing
• *Product recommendations* — What's trending in Kenya
• *Pricing advice* — Competitive pricing based on market data
• *Marketing tips* — Best posting times, strategies
• *Weekly report* — Automated performance summary

Ask "What should I sell?" or "Give me business advice!"
        `.trim(),
    };

    const text = helpTopics[topic || 'general'] || helpTopics.general;
    return { success: true, help_text: text };
}

export default { executeTool };
