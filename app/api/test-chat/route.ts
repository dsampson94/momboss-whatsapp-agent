/**
 * Test Chat API — Local development endpoint
 *
 * Simulates the WhatsApp webhook flow without needing Twilio.
 *
 *   POST /api/test-chat
 *   Body: { "message": "Hi I want to list a product", "from": "+254700000000" }
 *
 * Returns the AI agent's response as JSON.
 * Only available in development mode.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processMessage } from '@/app/lib/agent';
import {
    getOrCreateConversation,
    storeMessage,
} from '@/app/lib/conversation';
import logger from '@/app/lib/logger';

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const body = await request.json();
        const {
            message,
            from = '+254700000000',
            profileName = 'Test Vendor',
        } = body;

        if (!message) {
            return NextResponse.json(
                { error: 'Missing "message" in request body' },
                { status: 400 }
            );
        }

        const whatsappNumber = from.replace('whatsapp:', '');

        logger.info(`[TestChat] Message: "${message}" from ${whatsappNumber}`);

        // 1. Get or create conversation
        const conversation = await getOrCreateConversation(whatsappNumber, profileName);

        // 2. Store the inbound message
        await storeMessage({
            conversationId: conversation.id,
            direction: 'INBOUND',
            senderType: 'USER',
            content: message,
            contentType: 'TEXT',
        });

        // 3. Process through AI agent (the real deal!)
        const agentResponse = await processMessage(
            whatsappNumber,
            message
        );

        // 4. Store the outbound message
        await storeMessage({
            conversationId: conversation.id,
            direction: 'OUTBOUND',
            senderType: 'AGENT',
            content: agentResponse.reply,
            toolCalls: agentResponse.toolCalls,
            tokensUsed: agentResponse.tokensUsed,
        });

        const duration = Date.now() - startTime;

        logger.info(`[TestChat] Responded in ${duration}ms (${agentResponse.toolCalls?.length || 0} tool calls)`);

        return NextResponse.json({
            reply: agentResponse.reply,
            toolCalls: agentResponse.toolCalls || [],
            tokensUsed: agentResponse.tokensUsed || 0,
            duration,
            conversationId: conversation.id,
        });
    } catch (error: any) {
        logger.error('[TestChat] Error', { error: error.message, stack: error.stack });
        return NextResponse.json(
            {
                error: error.message,
                hint: 'Check your OPENAI_API_KEY and DATABASE_URL in .env.local',
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/test-chat — Returns a WhatsApp-style chat UI for testing
 */
export async function GET() {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>MB Agent — Test Chat</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f9fafb;
            color: #1f2937;
            height: 100vh;
            height: 100dvh;
            display: flex;
            flex-direction: column;
        }
        .header {
            background: #fff;
            padding: 10px 16px;
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 1px solid #f3f4f6;
        }
        .header .avatar {
            width: 32px; height: 32px;
            border-radius: 10px;
            background: #e91e8c;
            display: flex; align-items: center; justify-content: center;
            font-size: 12px; font-weight: 700; color: #fff;
        }
        .header .info h2 { font-size: 14px; font-weight: 600; color: #111827; }
        .header .info p { font-size: 10px; color: #9ca3af; }
        .header .back { color: #e91e8c; text-decoration: none; font-size: 13px; margin-right: 4px; }
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 12px 16px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .msg {
            max-width: 85%;
            padding: 10px 14px;
            font-size: 14px;
            line-height: 1.5;
            white-space: pre-wrap;
            word-break: break-word;
        }
        .msg.user {
            align-self: flex-end;
            background: #e91e8c;
            color: #fff;
            border-radius: 16px 16px 0 16px;
        }
        .msg.agent {
            align-self: flex-start;
            background: #fff;
            color: #1f2937;
            border-radius: 16px 16px 16px 0;
            border: 1px solid #e5e7eb;
        }
        .msg .meta {
            font-size: 10px;
            color: rgba(156,163,175,0.8);
            text-align: right;
            margin-top: 4px;
        }
        .msg.user .meta { color: rgba(255,255,255,0.6); }
        .msg .tools {
            font-size: 10px;
            color: #e91e8c;
            margin-top: 4px;
            padding-top: 4px;
            border-top: 1px solid rgba(0,0,0,0.06);
            font-weight: 500;
        }
        .msg.user .tools { border-top-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.7); }
        .input-area {
            background: #fff;
            padding: 8px 12px;
            display: flex;
            gap: 8px;
            align-items: center;
            border-top: 1px solid #f3f4f6;
            padding-bottom: max(8px, env(safe-area-inset-bottom));
        }
        .input-area input {
            flex: 1;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 10px 14px;
            color: #1f2937;
            font-size: 14px;
            outline: none;
            transition: border-color 0.15s;
        }
        .input-area input:focus { border-color: #e91e8c; }
        .input-area input::placeholder { color: #9ca3af; }
        .input-area button {
            background: #e91e8c;
            border: none;
            border-radius: 10px;
            width: 40px; height: 40px;
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            font-size: 16px; color: #fff;
            flex-shrink: 0;
            transition: opacity 0.15s;
        }
        .input-area button:disabled { opacity: 0.4; cursor: not-allowed; }
        .typing {
            align-self: flex-start;
            background: #fff;
            padding: 10px 14px;
            border-radius: 16px 16px 16px 0;
            border: 1px solid #e5e7eb;
            display: none;
        }
        .typing.show { display: block; }
        .typing span {
            display: inline-block;
            width: 6px; height: 6px;
            border-radius: 50%;
            background: #d1d5db;
            animation: bounce 1.2s infinite;
            margin-right: 3px;
        }
        .typing span:nth-child(2) { animation-delay: 0.2s; }
        .typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-4px); }
        }
    </style>
</head>
<body>
    <div class="header">
        <a href="/" class="back">←</a>
        <div class="avatar">MB</div>
        <div class="info">
            <h2>MomBoss Agent</h2>
            <p>Test Mode</p>
        </div>
    </div>
    <div class="messages" id="messages">
        <div class="msg agent">
            Test chat ready. Type a message to talk to the AI agent.
            <div class="meta">system</div>
        </div>
    </div>
    <div class="typing" id="typing"><span></span><span></span><span></span></div>
    <div class="input-area">
        <input type="text" id="input" placeholder="Type a message..." autofocus />
        <button id="send" onclick="sendMessage()">↑</button>
    </div>
    <script>
        var messagesEl = document.getElementById('messages');
        var inputEl = document.getElementById('input');
        var sendBtn = document.getElementById('send');
        var typingEl = document.getElementById('typing');

        inputEl.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !sendBtn.disabled) sendMessage();
        });

        function sendMessage() {
            var text = inputEl.value.trim();
            if (!text) return;

            appendMsg(text, 'user', '', '');
            inputEl.value = '';
            sendBtn.disabled = true;
            typingEl.classList.add('show');
            scrollBottom();

            fetch('/api/test-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.error) {
                    appendMsg('Error: ' + data.error + (data.hint ? '\\nHint: ' + data.hint : ''), 'agent', '', '');
                } else {
                    var toolInfo = data.toolCalls && data.toolCalls.length
                        ? '⚡ ' + data.toolCalls.map(function(t) { return t.name; }).join(', ')
                        : '';
                    var meta = data.duration + 'ms' + (data.tokensUsed ? ' · ' + data.tokensUsed + ' tok' : '');
                    appendMsg(data.reply, 'agent', meta, toolInfo);
                }
                typingEl.classList.remove('show');
                sendBtn.disabled = false;
                inputEl.focus();
                scrollBottom();
            })
            .catch(function(err) {
                appendMsg('Network error: ' + err.message, 'agent', '', '');
                typingEl.classList.remove('show');
                sendBtn.disabled = false;
            });
        }

        function appendMsg(text, type, meta, tools) {
            var div = document.createElement('div');
            div.className = 'msg ' + type;
            div.textContent = text;
            if (meta) {
                var m = document.createElement('div');
                m.className = 'meta';
                m.textContent = meta;
                div.appendChild(m);
            }
            if (tools) {
                var t = document.createElement('div');
                t.className = 'tools';
                t.textContent = tools;
                div.appendChild(t);
            }
            messagesEl.appendChild(div);
            scrollBottom();
        }

        function scrollBottom() {
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }
    </script>
</body>
</html>`;

    return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
    });
}
