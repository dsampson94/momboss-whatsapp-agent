/**
 * Test Script: Check WordPress / WooCommerce connection
 *
 * Usage:
 *   npx tsx scripts/test-wordpress.ts
 *
 * Tests that we can actually reach momboss.space APIs.
 * Run this first to validate credentials are working.
 */

import 'dotenv/config';

const WORDPRESS_URL = process.env.WORDPRESS_URL || 'https://momboss.space';
const WC_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY || '';
const WC_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET || '';
const WP_USERNAME = process.env.WORDPRESS_USERNAME || '';
const WP_APP_PASSWORD = process.env.WORDPRESS_APP_PASSWORD || '';

async function testConnection() {
    console.log('🔍 MomBoss WordPress Connection Test\n');
    console.log(`🌐 URL: ${WORDPRESS_URL}`);
    console.log(`🔑 WC Key: ${WC_KEY ? WC_KEY.slice(0, 8) + '...' : '❌ MISSING'}`);
    console.log(`🔑 WP User: ${WP_USERNAME || '❌ MISSING'}`);
    console.log(`🔑 WP Pass: ${WP_APP_PASSWORD ? '***set***' : '❌ MISSING'}\n`);

    // Test 1: Can we reach WordPress at all?
    console.log('--- Test 1: WordPress Reachable ---');
    try {
        const res = await fetch(`${WORDPRESS_URL}/wp-json/`, { signal: AbortSignal.timeout(10000) });
        const data = await res.json();
        console.log(`✅ WordPress reachable: ${data.name || 'OK'}`);
        console.log(`   Description: ${data.description || 'N/A'}`);
        console.log(`   URL: ${data.url}`);
    } catch (e: any) {
        console.log(`❌ Cannot reach WordPress: ${e.message}`);
        console.log('   Check WORDPRESS_URL in .env.local');
        return;
    }

    // Test 2: WooCommerce REST API
    console.log('\n--- Test 2: WooCommerce API ---');
    if (!WC_KEY || !WC_SECRET) {
        console.log('⏭️  Skipped — no WC credentials set');
    } else {
        try {
            const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');
            const res = await fetch(`${WORDPRESS_URL}/wp-json/wc/v3/products?per_page=1`, {
                headers: { Authorization: `Basic ${auth}` },
                signal: AbortSignal.timeout(15000),
            });

            if (res.ok) {
                const products = await res.json();
                console.log(`✅ WooCommerce API working!`);
                console.log(`   Found ${products.length > 0 ? 'products' : 'no products yet'}`);
                if (products[0]) {
                    console.log(`   Sample: "${products[0].name}" — ${products[0].regular_price || 'no price'}`);
                }
            } else {
                const err = await res.json().catch(() => ({}));
                console.log(`❌ WooCommerce API error (${res.status}): ${err.message || res.statusText}`);
            }
        } catch (e: any) {
            console.log(`❌ WooCommerce API failed: ${e.message}`);
        }
    }

    // Test 3: WordPress REST API (with app password)
    console.log('\n--- Test 3: WordPress REST API (Auth) ---');
    if (!WP_USERNAME || !WP_APP_PASSWORD) {
        console.log('⏭️  Skipped — no WP credentials set');
    } else {
        try {
            const auth = Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString('base64');
            const res = await fetch(`${WORDPRESS_URL}/wp-json/wp/v2/users/me`, {
                headers: { Authorization: `Basic ${auth}` },
                signal: AbortSignal.timeout(10000),
            });

            if (res.ok) {
                const user = await res.json();
                console.log(`✅ WordPress auth working!`);
                console.log(`   Logged in as: ${user.name} (ID: ${user.id})`);
                console.log(`   Roles: ${user.roles?.join(', ') || 'N/A'}`);
            } else {
                const err = await res.json().catch(() => ({}));
                console.log(`❌ WordPress auth error (${res.status}): ${err.message || res.statusText}`);
            }
        } catch (e: any) {
            console.log(`❌ WordPress auth failed: ${e.message}`);
        }
    }

    // Test 4: Dokan REST API
    console.log('\n--- Test 4: Dokan API ---');
    if (!WP_USERNAME || !WP_APP_PASSWORD) {
        console.log('⏭️  Skipped — no WP credentials set');
    } else {
        try {
            const auth = Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString('base64');
            const res = await fetch(`${WORDPRESS_URL}/wp-json/dokan/v1/stores?per_page=3`, {
                headers: { Authorization: `Basic ${auth}` },
                signal: AbortSignal.timeout(15000),
            });

            if (res.ok) {
                const stores = await res.json();
                console.log(`✅ Dokan API working!`);
                console.log(`   Found ${stores.length} store(s)`);
                for (const s of stores.slice(0, 3)) {
                    console.log(`   • ${s.store_name || 'Unnamed'} (ID: ${s.id}) — ${s.email || 'no email'}`);
                }
            } else {
                const err = await res.json().catch(() => ({}));
                console.log(`❌ Dokan API error (${res.status}): ${err.message || res.statusText}`);
                if (res.status === 404) {
                    console.log('   Dokan REST API may not be enabled or plugin not active');
                }
            }
        } catch (e: any) {
            console.log(`❌ Dokan API failed: ${e.message}`);
        }
    }

    // Test 5: Product Categories
    console.log('\n--- Test 5: Product Categories ---');
    if (!WC_KEY || !WC_SECRET) {
        console.log('⏭️  Skipped — no WC credentials set');
    } else {
        try {
            const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');
            const res = await fetch(`${WORDPRESS_URL}/wp-json/wc/v3/products/categories?per_page=10`, {
                headers: { Authorization: `Basic ${auth}` },
                signal: AbortSignal.timeout(10000),
            });

            if (res.ok) {
                const cats = await res.json();
                console.log(`✅ Categories loaded: ${cats.length} found`);
                for (const c of cats.slice(0, 5)) {
                    console.log(`   • ${c.name} (ID: ${c.id}) — ${c.count} products`);
                }
            } else {
                console.log(`❌ Categories error (${res.status})`);
            }
        } catch (e: any) {
            console.log(`❌ Categories failed: ${e.message}`);
        }
    }

    // Test 6: OpenAI API Key
    console.log('\n--- Test 6: OpenAI (GPT) API ---');
    const openaiKey = process.env.OPENAI_API_KEY || '';
    if (!openaiKey) {
        console.log('⏭️  Skipped — no OPENAI_API_KEY set');
    } else {
        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiKey}`,
                },
                body: JSON.stringify({
                    model: process.env.OPENAI_MODEL || 'gpt-4o',
                    max_tokens: 50,
                    messages: [{ role: 'user', content: 'Say "MomBoss AI ready!" in exactly those words.' }],
                }),
                signal: AbortSignal.timeout(15000),
            });

            if (res.ok) {
                const data = await res.json();
                const text = data.choices?.[0]?.message?.content || '';
                console.log(`✅ OpenAI API working!`);
                console.log(`   Response: "${text}"`);
                console.log(`   Model: ${data.model}`);
            } else {
                const err = await res.json().catch(() => ({}));
                console.log(`❌ OpenAI API error (${res.status}): ${err.error?.message || res.statusText}`);
            }
        } catch (e: any) {
            console.log(`❌ OpenAI API failed: ${e.message}`);
        }
    }

    console.log('\n========================================');
    console.log('Done! Fix any ❌ above before running the demo.');
    console.log('========================================\n');
}

testConnection();
