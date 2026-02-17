/**
 * WooCommerce & Dokan REST API Client
 *
 * This is the bridge between our AI agent and the MomBoss WordPress backend.
 * It wraps the WooCommerce REST API v3 and Dokan REST API v1.
 *
 * WooCommerce API docs: https://woocommerce.github.io/woocommerce-rest-api-docs/
 * Dokan API docs: https://developer.wedevs.com/docs/dokan/
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import logger from './logger';

// ============================================
// CLIENT SETUP
// ============================================

const WORDPRESS_URL = process.env.WORDPRESS_URL || 'https://momboss.space';
const WC_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY || '';
const WC_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET || '';
const WP_USERNAME = process.env.WORDPRESS_USERNAME || '';
const WP_APP_PASSWORD = process.env.WORDPRESS_APP_PASSWORD || '';

/** WooCommerce REST API v3 client */
const wooClient: AxiosInstance = axios.create({
    baseURL: `${WORDPRESS_URL}/wp-json/wc/v3`,
    auth: { username: WC_KEY, password: WC_SECRET },
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

/** Dokan REST API v1 client (uses WordPress auth) */
const dokanClient: AxiosInstance = axios.create({
    baseURL: `${WORDPRESS_URL}/wp-json/dokan/v1`,
    auth: { username: WP_USERNAME, password: WP_APP_PASSWORD },
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

/** WordPress REST API client */
const wpClient: AxiosInstance = axios.create({
    baseURL: `${WORDPRESS_URL}/wp-json/wp/v2`,
    auth: { username: WP_USERNAME, password: WP_APP_PASSWORD },
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

// Error handler helper
function handleApiError(error: unknown, context: string): string {
    if (error instanceof AxiosError) {
        const status = error.response?.status;
        const data = error.response?.data;
        const message = data?.message || data?.error || error.message;
        logger.error(`[WP API] ${context} failed`, { status, message, data });
        return `Error (${status}): ${message}`;
    }
    logger.error(`[WP API] ${context} failed`, { error });
    return `Error: ${String(error)}`;
}

// ============================================
// PRODUCTS
// ============================================

export interface CreateProductInput {
    name: string;
    description?: string;
    short_description?: string;
    regular_price: string;      // WooCommerce expects price as string
    sale_price?: string;
    categories?: { id: number }[];
    images?: { src: string; name?: string }[];
    status?: 'publish' | 'draft' | 'pending';
    type?: 'simple' | 'variable' | 'grouped';
    manage_stock?: boolean;
    stock_quantity?: number;
    sku?: string;
}

export async function createProduct(input: CreateProductInput) {
    try {
        const payload = {
            ...input,
            status: input.status || 'draft', // Default to draft for safety
        };
        const { data } = await wooClient.post('/products', payload);
        logger.info(`[Products] Created product: ${data.id} - ${data.name}`);
        return {
            success: true,
            product: {
                id: data.id,
                name: data.name,
                price: data.regular_price,
                status: data.status,
                permalink: data.permalink,
                link: `${WORDPRESS_URL}/wp-admin/post.php?post=${data.id}&action=edit`,
            },
        };
    } catch (error) {
        return { success: false, error: handleApiError(error, 'Create product') };
    }
}

export async function listProducts(params: {
    vendor_id?: number;
    status?: string;
    per_page?: number;
    page?: number;
    search?: string;
} = {}) {
    try {
        const { data } = await wooClient.get('/products', {
            params: {
                per_page: params.per_page || 10,
                page: params.page || 1,
                status: params.status || 'any',
                search: params.search,
                // Dokan filter - only works if Dokan modifies WC REST API
                ...(params.vendor_id ? { author: params.vendor_id } : {}),
            },
        });
        return {
            success: true,
            products: data.map((p: any) => ({
                id: p.id,
                name: p.name,
                price: p.regular_price,
                sale_price: p.sale_price,
                status: p.status,
                stock_status: p.stock_status,
                stock_quantity: p.stock_quantity,
                total_sales: p.total_sales,
                permalink: p.permalink,
            })),
            count: data.length,
        };
    } catch (error) {
        return { success: false, error: handleApiError(error, 'List products') };
    }
}

export async function getProduct(productId: number) {
    try {
        const { data } = await wooClient.get(`/products/${productId}`);
        return {
            success: true,
            product: {
                id: data.id,
                name: data.name,
                description: data.short_description || data.description,
                price: data.regular_price,
                sale_price: data.sale_price,
                status: data.status,
                stock_status: data.stock_status,
                stock_quantity: data.stock_quantity,
                categories: data.categories?.map((c: any) => c.name),
                images: data.images?.map((i: any) => i.src),
                permalink: data.permalink,
                total_sales: data.total_sales,
            },
        };
    } catch (error) {
        return { success: false, error: handleApiError(error, 'Get product') };
    }
}

export async function updateProduct(productId: number, updates: Partial<CreateProductInput>) {
    try {
        const { data } = await wooClient.put(`/products/${productId}`, updates);
        logger.info(`[Products] Updated product: ${data.id} - ${data.name}`);
        return {
            success: true,
            product: {
                id: data.id,
                name: data.name,
                price: data.regular_price,
                status: data.status,
                permalink: data.permalink,
            },
        };
    } catch (error) {
        return { success: false, error: handleApiError(error, 'Update product') };
    }
}

// ============================================
// ORDERS
// ============================================

export async function listOrders(params: {
    vendor_id?: number;
    status?: string;
    per_page?: number;
    page?: number;
} = {}) {
    try {
        const { data } = await wooClient.get('/orders', {
            params: {
                per_page: params.per_page || 10,
                page: params.page || 1,
                status: params.status,
            },
        });
        return {
            success: true,
            orders: data.map((o: any) => ({
                id: o.id,
                number: o.number,
                status: o.status,
                total: o.total,
                currency: o.currency,
                customer_name: `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim(),
                items_count: o.line_items?.length || 0,
                items: o.line_items?.map((li: any) => ({
                    name: li.name,
                    quantity: li.quantity,
                    total: li.total,
                })),
                date_created: o.date_created,
            })),
            count: data.length,
        };
    } catch (error) {
        return { success: false, error: handleApiError(error, 'List orders') };
    }
}

export async function getOrder(orderId: number) {
    try {
        const { data } = await wooClient.get(`/orders/${orderId}`);
        return {
            success: true,
            order: {
                id: data.id,
                number: data.number,
                status: data.status,
                total: data.total,
                currency: data.currency,
                customer: {
                    name: `${data.billing?.first_name || ''} ${data.billing?.last_name || ''}`.trim(),
                    email: data.billing?.email,
                    phone: data.billing?.phone,
                },
                items: data.line_items?.map((li: any) => ({
                    name: li.name,
                    quantity: li.quantity,
                    total: li.total,
                    product_id: li.product_id,
                })),
                shipping: data.shipping_lines?.[0]?.method_title || 'N/A',
                payment_method: data.payment_method_title,
                date_created: data.date_created,
                date_paid: data.date_paid,
                notes: data.customer_note,
            },
        };
    } catch (error) {
        return { success: false, error: handleApiError(error, 'Get order') };
    }
}

export async function updateOrderStatus(orderId: number, status: string) {
    try {
        const { data } = await wooClient.put(`/orders/${orderId}`, { status });
        logger.info(`[Orders] Updated order ${orderId} status to: ${status}`);
        return {
            success: true,
            order: { id: data.id, number: data.number, status: data.status },
        };
    } catch (error) {
        return { success: false, error: handleApiError(error, 'Update order status') };
    }
}

// ============================================
// CUSTOMER LOOKUP (via WooCommerce API)
// ============================================

/**
 * Search for a WooCommerce customer by email.
 * This uses the WooCommerce REST API (not Dokan) so it works without
 * a WordPress App Password.
 *
 * Note: WooCommerce's `email` filter doesn't always match admin/vendor roles,
 * so we also fall back to a `search` query and verify the email matches.
 */
export async function searchCustomerByEmail(email: string) {
    try {
        // Try exact email filter first
        const { data } = await wooClient.get('/customers', {
            params: { email, per_page: 1 },
        });
        if (data && data.length > 0) {
            const c = data[0];
            return {
                success: true,
                customer: {
                    id: c.id,
                    email: c.email,
                    first_name: c.first_name,
                    last_name: c.last_name,
                    username: c.username,
                    role: c.role,
                },
            };
        }

        // Fallback: search by keyword (catches admins/vendors that email filter misses)
        const { data: searchData } = await wooClient.get('/customers', {
            params: { search: email, per_page: 10, role: 'all' },
        });
        if (searchData && searchData.length > 0) {
            // Verify we got an exact email match from the search results
            const match = searchData.find(
                (c: any) => c.email?.toLowerCase() === email.toLowerCase()
            );
            if (match) {
                return {
                    success: true,
                    customer: {
                        id: match.id,
                        email: match.email,
                        first_name: match.first_name,
                        last_name: match.last_name,
                        username: match.username,
                        role: match.role,
                    },
                };
            }
        }

        return { success: false, error: 'No customer found with that email' };
    } catch (error) {
        return { success: false, error: handleApiError(error, 'Search customer by email') };
    }
}

// ============================================
// DOKAN VENDORS / STORES
// ============================================

export async function listVendors(params: { per_page?: number; page?: number } = {}) {
    try {
        const { data } = await dokanClient.get('/stores', {
            params: { per_page: params.per_page || 10, page: params.page || 1 },
        });
        return {
            success: true,
            vendors: data.map((v: any) => ({
                id: v.id,
                store_name: v.store_name,
                phone: v.phone,
                email: v.email,
                address: v.address,
                banner: v.banner,
                rating: v.rating,
                products_count: v.products_count || 0,
            })),
        };
    } catch (error) {
        return { success: false, error: handleApiError(error, 'List vendors') };
    }
}

export async function getVendor(vendorId: number) {
    try {
        const { data } = await dokanClient.get(`/stores/${vendorId}`);
        return {
            success: true,
            vendor: {
                id: data.id,
                store_name: data.store_name,
                phone: data.phone,
                email: data.email,
                address: data.address,
                social: data.social,
                banner: data.banner,
                rating: data.rating,
                products_count: data.products_count || 0,
                registered: data.registered,
            },
        };
    } catch (error) {
        return { success: false, error: handleApiError(error, 'Get vendor') };
    }
}

export async function getVendorDashboardStats(vendorId: number) {
    try {
        const { data } = await dokanClient.get(`/stores/${vendorId}/stats`);
        return { success: true, stats: data };
    } catch (error) {
        // Fallback: compose stats from orders
        try {
            const orders = await listOrders({ vendor_id: vendorId, per_page: 100 });
            if (orders.success) {
                const totalRevenue = orders.orders.reduce(
                    (sum: number, o: any) => sum + parseFloat(o.total || '0'), 0
                );
                return {
                    success: true,
                    stats: {
                        total_orders: orders.count,
                        total_revenue: totalRevenue.toFixed(2),
                        source: 'computed',
                    },
                };
            }
        } catch { /* ignore fallback error */ }
        return { success: false, error: handleApiError(error, 'Get vendor stats') };
    }
}

// ============================================
// PRODUCT CATEGORIES
// ============================================

export async function listCategories(params: { per_page?: number } = {}) {
    try {
        const { data } = await wooClient.get('/products/categories', {
            params: { per_page: params.per_page || 50, orderby: 'name' },
        });
        return {
            success: true,
            categories: data.map((c: any) => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                count: c.count,
                parent: c.parent,
            })),
        };
    } catch (error) {
        return { success: false, error: handleApiError(error, 'List categories') };
    }
}

// ============================================
// EVENTS (WP Events / Dokan Events if available)
// ============================================

export async function createEvent(input: {
    title: string;
    description?: string;
    start_date: string;        // ISO date string
    end_date?: string;
    venue?: string;
    type?: 'virtual' | 'hybrid' | 'in_person';
    ticket_price?: string;
    status?: 'publish' | 'draft';
}) {
    try {
        // Try Dokan events endpoint first
        const payload = {
            title: input.title,
            content: input.description || '',
            status: input.status || 'draft',
            meta: {
                _event_start_date: input.start_date,
                _event_end_date: input.end_date || input.start_date,
                _event_venue: input.venue || '',
                _event_type: input.type || 'virtual',
                _ticket_price: input.ticket_price || '0',
            },
        };

        // Try the WP events custom post type
        const { data } = await wpClient.post('/tribe_events', payload);
        logger.info(`[Events] Created event: ${data.id} - ${data.title?.rendered}`);
        return {
            success: true,
            event: {
                id: data.id,
                title: data.title?.rendered || input.title,
                status: data.status,
                link: data.link,
            },
        };
    } catch (error) {
        // Fallback: create as a regular post with event category
        try {
            const { data } = await wpClient.post('/posts', {
                title: input.title,
                content: `${input.description || ''}\n\n📅 Date: ${input.start_date}\n📍 Venue: ${input.venue || 'Virtual'}\n🎟️ Type: ${input.type || 'virtual'}`,
                status: input.status || 'draft',
                categories: [], // Would need to find/create an "Events" category
            });
            logger.info(`[Events] Created event as post: ${data.id}`);
            return {
                success: true,
                event: {
                    id: data.id,
                    title: data.title?.rendered || input.title,
                    status: data.status,
                    link: data.link,
                    note: 'Created as a post — dedicated events plugin endpoint not found.',
                },
            };
        } catch (fallbackError) {
            return { success: false, error: handleApiError(fallbackError, 'Create event (fallback)') };
        }
    }
}

// ============================================
// HEALTH CHECK
// ============================================

export async function checkWordPressConnection() {
    try {
        const [wcRes, wpRes] = await Promise.allSettled([
            wooClient.get('/system_status'),
            wpClient.get('/users/me'),
        ]);

        return {
            woocommerce: wcRes.status === 'fulfilled'
                ? { connected: true, version: (wcRes as any).value?.data?.environment?.version }
                : { connected: false, error: 'Cannot reach WooCommerce API' },
            wordpress: wpRes.status === 'fulfilled'
                ? { connected: true, user: (wpRes as any).value?.data?.name }
                : { connected: false, error: 'Cannot reach WordPress API' },
        };
    } catch (error) {
        return {
            woocommerce: { connected: false, error: String(error) },
            wordpress: { connected: false, error: String(error) },
        };
    }
}
