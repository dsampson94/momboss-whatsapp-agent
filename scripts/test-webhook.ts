/**
 * Test Script: Simulate a WhatsApp message hitting our webhook
 *
 * Usage:
 *   npx tsx scripts/test-webhook.ts
 *   npx tsx scripts/test-webhook.ts "Show me my products"
 *   npx tsx scripts/test-webhook.ts "Create a product called Chocolate Cake for 800"
 *
 * This simulates what Twilio sends when a vendor messages on WhatsApp.
 * Requires the dev server to be running: npm run dev
 */

const SERVER_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_PHONE = process.env.TEST_PHONE || '+254712345678'; // Kenyan number format

async function simulateWhatsAppMessage(message: string) {
    console.log('\n🔵 Simulating WhatsApp message...');
    console.log(`📱 From: ${TEST_PHONE}`);
    console.log(`💬 Message: "${message}"\n`);

    // Build form data matching Twilio's webhook format
    const formData = new URLSearchParams();
    formData.append('From', `whatsapp:${TEST_PHONE}`);
    formData.append('To', 'whatsapp:+14155238886');
    formData.append('Body', message);
    formData.append('ProfileName', 'Test MomBoss Vendor');
    formData.append('MessageSid', `SM_test_${Date.now()}`);
    formData.append('NumMedia', '0');

    try {
        const startTime = Date.now();

        const response = await fetch(`${SERVER_URL}/api/whatsapp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        const duration = Date.now() - startTime;
        const text = await response.text();

        console.log(`📡 Response: ${response.status} (${duration}ms)`);

        if (response.ok) {
            console.log('✅ Webhook processed successfully!\n');
        } else {
            console.log(`❌ Error: ${text}\n`);
        }

        // Now check what the agent responded by hitting the admin API
        console.log('📋 Checking conversation...');
        const convosRes = await fetch(`${SERVER_URL}/api/admin/conversations?limit=1`);
        const convosData = await convosRes.json();

        if (convosData.conversations?.length > 0) {
            const convo = convosData.conversations[0];
            console.log(`\n💬 Conversation: ${convo.vendorName || convo.whatsappNumber}`);
            console.log(`📊 Messages: ${convo.messageCount}`);

            // Get the full conversation to see the AI reply
            const detailRes = await fetch(`${SERVER_URL}/api/admin/conversations/${convo.id}`);
            const detailData = await detailRes.json();
            const messages = detailData.conversation?.messages || [];

            // Show last few messages
            const recent = messages.slice(-4);
            console.log('\n--- Recent Messages ---');
            for (const msg of recent) {
                const icon = msg.direction === 'INBOUND' ? '👤 Vendor' : '🤖 Agent';
                const time = new Date(msg.createdAt).toLocaleTimeString();
                console.log(`\n${icon} (${time}):`);
                console.log(msg.content || '[no text]');
                if (msg.toolCalls) {
                    const tools = Array.isArray(msg.toolCalls) ? msg.toolCalls : [msg.toolCalls];
                    for (const tc of tools) {
                        console.log(`  ⚡ Tool: ${tc.name} → ${tc.result?.success ? '✅' : '❌'}`);
                    }
                }
            }
            console.log('\n-----------------------');
        } else {
            console.log('No conversations found yet.');
        }
    } catch (error: any) {
        if (error.cause?.code === 'ECONNREFUSED') {
            console.error('❌ Cannot connect to server. Is it running? Start with: npm run dev');
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

// Get message from command line args or use default
const message = process.argv.slice(2).join(' ') || 'Hi! I want to set up my store on MomBoss';

simulateWhatsAppMessage(message);
