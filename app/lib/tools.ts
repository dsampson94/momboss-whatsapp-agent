/**
 * Claude AI Tool Definitions
 *
 * These are the tools (functions) that Claude can call when processing
 * vendor messages. Each tool maps to a WordPress/WooCommerce/Dokan API function.
 *
 * Anthropic tool use docs: https://docs.anthropic.com/en/docs/tool-use
 */

import type { Tool } from '@anthropic-ai/sdk/resources/messages';

// ============================================
// TOOL DEFINITIONS FOR CLAUDE
// ============================================

export const agentTools: Tool[] = [
    // ------------------------------------------
    // PRODUCTS
    // ------------------------------------------
    {
        name: 'create_product',
        description:
            'Create a new product in the vendor\'s WooCommerce store. Use this when a vendor wants to add/list a new product. Always confirm the details with the vendor before creating. Products are created as drafts by default.',
        input_schema: {
            type: 'object' as const,
            properties: {
                name: {
                    type: 'string',
                    description: 'The product name/title',
                },
                description: {
                    type: 'string',
                    description: 'Full product description (can include HTML)',
                },
                short_description: {
                    type: 'string',
                    description: 'Short summary shown on listing pages',
                },
                regular_price: {
                    type: 'string',
                    description: 'The product price as a string, e.g. "500" or "1200". Currency is KES (Kenyan Shillings).',
                },
                sale_price: {
                    type: 'string',
                    description: 'Optional sale/discounted price as a string',
                },
                categories: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: { id: { type: 'number' } },
                        required: ['id'],
                    },
                    description: 'Array of category objects with id. Use list_categories first to find the right IDs.',
                },
                images: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            src: { type: 'string', description: 'Image URL' },
                            name: { type: 'string', description: 'Image filename/alt text' },
                        },
                        required: ['src'],
                    },
                    description: 'Product images (URLs). The vendor can send images via WhatsApp.',
                },
                status: {
                    type: 'string',
                    enum: ['publish', 'draft', 'pending'],
                    description: 'Product status. Default is "draft" for vendor review.',
                },
                sku: {
                    type: 'string',
                    description: 'Stock keeping unit — a unique product identifier',
                },
                manage_stock: {
                    type: 'boolean',
                    description: 'Whether to track stock quantity',
                },
                stock_quantity: {
                    type: 'number',
                    description: 'Number of items in stock (if manage_stock is true)',
                },
            },
            required: ['name', 'regular_price'],
        },
    },

    {
        name: 'list_products',
        description:
            'List products from the vendor\'s store. Use this when a vendor asks to see their products, check stock, or search for a specific product.',
        input_schema: {
            type: 'object' as const,
            properties: {
                search: {
                    type: 'string',
                    description: 'Search by product name or keyword',
                },
                status: {
                    type: 'string',
                    enum: ['any', 'publish', 'draft', 'pending', 'private'],
                    description: 'Filter by status. Default is "any".',
                },
                per_page: {
                    type: 'number',
                    description: 'Number of products to return (max 100). Default 10.',
                },
                page: {
                    type: 'number',
                    description: 'Page number for pagination. Default 1.',
                },
            },
            required: [],
        },
    },

    {
        name: 'get_product',
        description:
            'Get full details of a specific product by its ID. Use when a vendor asks about a particular product.',
        input_schema: {
            type: 'object' as const,
            properties: {
                product_id: {
                    type: 'number',
                    description: 'The WooCommerce product ID',
                },
            },
            required: ['product_id'],
        },
    },

    {
        name: 'update_product',
        description:
            'Update an existing product. Use when a vendor wants to change price, description, stock, status, etc. Only include the fields to update.',
        input_schema: {
            type: 'object' as const,
            properties: {
                product_id: {
                    type: 'number',
                    description: 'The product ID to update',
                },
                name: { type: 'string', description: 'New product name' },
                description: { type: 'string', description: 'New description' },
                short_description: { type: 'string', description: 'New short description' },
                regular_price: { type: 'string', description: 'New price' },
                sale_price: { type: 'string', description: 'New sale price (or empty string to remove sale)' },
                status: {
                    type: 'string',
                    enum: ['publish', 'draft', 'pending', 'private'],
                    description: 'New status',
                },
                manage_stock: { type: 'boolean' },
                stock_quantity: { type: 'number', description: 'New stock quantity' },
            },
            required: ['product_id'],
        },
    },

    // ------------------------------------------
    // ORDERS
    // ------------------------------------------
    {
        name: 'list_orders',
        description:
            'List orders from the vendor\'s store. Use when a vendor asks about their orders, sales, or recent purchases.',
        input_schema: {
            type: 'object' as const,
            properties: {
                status: {
                    type: 'string',
                    enum: ['any', 'pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed'],
                    description: 'Filter by order status',
                },
                per_page: {
                    type: 'number',
                    description: 'Number of orders to return. Default 10.',
                },
                page: { type: 'number', description: 'Page number' },
            },
            required: [],
        },
    },

    {
        name: 'get_order',
        description:
            'Get full details of a specific order by ID. Use when a vendor asks about a particular order.',
        input_schema: {
            type: 'object' as const,
            properties: {
                order_id: {
                    type: 'number',
                    description: 'The WooCommerce order ID',
                },
            },
            required: ['order_id'],
        },
    },

    {
        name: 'update_order_status',
        description:
            'Update the status of an order. Use when a vendor wants to mark an order as completed, processing, etc.',
        input_schema: {
            type: 'object' as const,
            properties: {
                order_id: {
                    type: 'number',
                    description: 'The order ID to update',
                },
                status: {
                    type: 'string',
                    enum: ['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded'],
                    description: 'The new order status',
                },
            },
            required: ['order_id', 'status'],
        },
    },

    // ------------------------------------------
    // CATEGORIES
    // ------------------------------------------
    {
        name: 'list_categories',
        description:
            'List all product categories. Use when you need to find category IDs for creating/updating products, or when a vendor asks about available categories.',
        input_schema: {
            type: 'object' as const,
            properties: {
                per_page: {
                    type: 'number',
                    description: 'Number of categories to return. Default 50.',
                },
            },
            required: [],
        },
    },

    // ------------------------------------------
    // VENDOR / STORE INFO
    // ------------------------------------------
    {
        name: 'get_vendor_info',
        description:
            'Get the vendor\'s store profile and details from Dokan. Use when a vendor asks about their store info or profile.',
        input_schema: {
            type: 'object' as const,
            properties: {
                vendor_id: {
                    type: 'number',
                    description: 'The Dokan vendor/store ID',
                },
            },
            required: ['vendor_id'],
        },
    },

    {
        name: 'get_vendor_stats',
        description:
            'Get dashboard stats for a vendor (total orders, revenue, etc). Use when a vendor asks "how is my store doing?" or wants sales summaries.',
        input_schema: {
            type: 'object' as const,
            properties: {
                vendor_id: {
                    type: 'number',
                    description: 'The Dokan vendor/store ID',
                },
            },
            required: ['vendor_id'],
        },
    },

    // ------------------------------------------
    // EVENTS
    // ------------------------------------------
    {
        name: 'create_event',
        description:
            'Create a new event on the MomBoss platform. Use when a vendor wants to create a workshop, meetup, or any event.',
        input_schema: {
            type: 'object' as const,
            properties: {
                title: {
                    type: 'string',
                    description: 'Event title',
                },
                description: {
                    type: 'string',
                    description: 'Event description',
                },
                start_date: {
                    type: 'string',
                    description: 'Event start date/time in ISO format, e.g. "2026-03-15T10:00:00"',
                },
                end_date: {
                    type: 'string',
                    description: 'Event end date/time in ISO format',
                },
                venue: {
                    type: 'string',
                    description: 'Event location or "Virtual" for online events',
                },
                type: {
                    type: 'string',
                    enum: ['virtual', 'hybrid', 'in_person'],
                    description: 'Event type',
                },
                ticket_price: {
                    type: 'string',
                    description: 'Ticket price as string, e.g. "50.00". Use "0" for free events.',
                },
                status: {
                    type: 'string',
                    enum: ['publish', 'draft'],
                    description: 'Event status. Default is "draft".',
                },
            },
            required: ['title', 'start_date'],
        },
    },

    // ------------------------------------------
    // VERIFICATION
    // ------------------------------------------
    {
        name: 'verify_vendor',
        description:
            'Verify and link a WhatsApp number to a Dokan vendor account. Use when a vendor first contacts us and needs to prove they own a store. Ask for their store email or store ID.',
        input_schema: {
            type: 'object' as const,
            properties: {
                store_email: {
                    type: 'string',
                    description: 'The email address associated with the Dokan store',
                },
                store_id: {
                    type: 'number',
                    description: 'The Dokan store ID (if known)',
                },
            },
            required: [],
        },
    },

    // ------------------------------------------
    // AMY — MARKETING & ADVERTISING
    // ------------------------------------------
    {
        name: 'generate_ad_copy',
        description:
            'Generate marketing copy and ad text for a vendor\'s product (AMY agent). Use when a vendor says "advertise", "promote", "create an ad", or "market my product". Generates catchy copy for Facebook, Instagram, and WhatsApp formats.',
        input_schema: {
            type: 'object' as const,
            properties: {
                product_name: {
                    type: 'string',
                    description: 'The product name to advertise',
                },
                product_description: {
                    type: 'string',
                    description: 'Brief product description',
                },
                price: {
                    type: 'string',
                    description: 'Product price in KES',
                },
                target_audience: {
                    type: 'string',
                    description: 'Who the ad is targeting (e.g., "moms in Nairobi", "young professionals")',
                },
                tone: {
                    type: 'string',
                    enum: ['fun', 'professional', 'luxurious', 'urgent', 'heartfelt'],
                    description: 'Tone of the ad copy',
                },
                product_id: {
                    type: 'number',
                    description: 'WooCommerce product ID (to pull details automatically)',
                },
            },
            required: ['product_name'],
        },
    },

    // ------------------------------------------
    // MIRA — BUSINESS INTELLIGENCE
    // ------------------------------------------
    {
        name: 'get_business_insights',
        description:
            'Get business insights and advice for the vendor (MIRA agent). Use when a vendor asks "how is my store doing?", "what should I sell?", "give me advice", or wants performance data. Provides sales summaries, trending suggestions, and pricing advice.',
        input_schema: {
            type: 'object' as const,
            properties: {
                insight_type: {
                    type: 'string',
                    enum: ['sales_summary', 'product_recommendations', 'pricing_advice', 'marketing_tips', 'weekly_report'],
                    description: 'Type of insight requested',
                },
                vendor_id: {
                    type: 'number',
                    description: 'Dokan vendor ID to pull data for',
                },
            },
            required: ['insight_type'],
        },
    },

    // ------------------------------------------
    // HELP / INFO
    // ------------------------------------------
    {
        name: 'get_help',
        description:
            'Show a help menu of what the MomBoss WhatsApp AI agents can do. Use when a vendor asks for help or seems confused about capabilities.',
        input_schema: {
            type: 'object' as const,
            properties: {
                topic: {
                    type: 'string',
                    enum: ['products', 'orders', 'store', 'events', 'advertising', 'insights', 'general'],
                    description: 'Specific help topic, or "general" for an overview',
                },
            },
            required: [],
        },
    },
];

export default agentTools;
