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
    // Safety: only in development
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
            { error: 'Test endpoint disabled in production' },
            { status: 403 }
        );
    }

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
                hint: 'Check your ANTHROPIC_API_KEY and DATABASE_URL in .env.local',
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/test-chat — Returns a WhatsApp-style chat UI for testing
 */
export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MomBoss Agent Test Chat</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0b141a;
            color: #e9edef;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            background: #202c33;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            border-bottom: 1px solid #2a3942;
        }
        .header .avatar {
            width: 40px; height: 40px;
            border-radius: 50%;
            background: #00a884;
            display: flex; align-items: center; justify-content: center;
            font-size: 20px;
        }
        .header .info h2 { font-size: 16px; font-weight: 500; }
        .header .info p { font-size: 12px; color: #8696a0; }
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .msg {
            max-width: 75%;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 14px;
            line-height: 1.5;
            white-space: pre-wrap;
            word-break: break-word;
        }
        .msg.user {
            align-self: flex-end;
            background: #005c4b;
            border-radius: 8px 0 8px 8px;
        }
        .msg.agent {
            align-self: flex-start;
            background: #202c33;
            border-radius: 0 8px 8px 8px;
        }
        .msg .meta {
            font-size: 11px;
            color: #8696a0;
            text-align: right;
            margin-top: 4px;
        }
        .msg .tools {
            font-size: 11px;
            color: #00a884;
            margin-top: 4px;
            padding-top: 4px;
            border-top: 1px solid #2a3942;
        }
        .input-area {
            background: #202c33;
            padding: 8px 16px;
            display: flex;
            gap: 8px;
            align-items: center;
        }
        .input-area input {
            flex: 1;
            background: #2a3942;
            border: none;
            border-radius: 8px;
            padding: 10px 16px;
            color: #e9edef;
            font-size: 14px;
            outline: none;
        }
        .input-area input::placeholder { color: #8696a0; }
        .input-area button {
            background: #00a884;
            border: none;
            border-radius: 50%;
            width: 42px; height: 42px;
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            font-size: 18px; color: #fff;
        }
        .input-area button:disabled { opacity: 0.5; cursor: not-allowed; }
        .typing {
            align-self: flex-start;
            background: #202c33;
            padding: 12px 16px;
            border-radius: 0 8px 8px 8px;
            display: none;
            margin-left: 0;
        }
        .typing.show { display: block; }
        .typing span {
            display: inline-block;
            width: 8px; height: 8px;
            border-radius: 50%;
            background: #8696a0;
            animation: bounce 1.2s infinite;
            margin-right: 4px;
        }
        .typing span:nth-child(2) { animation-delay: 0.2s; }
        .typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-6px); }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="avatar">M</div>
        <div class="info">
            <h2>MomBoss Agent</h2>
            <p>AI Assistant - Test Mode</p>
        </div>
    </div>
    <div class="messages" id="messages">
        <div class="msg agent">
            Welcome to the MomBoss Agent test chat!<br><br>
            This simulates the WhatsApp experience. Type a message below to talk to the AI agent.
            <div class="meta">System</div>
        </div>
    </div>
    <div class="typing" id="typing"><span></span><span></span><span></span></div>
    <div class="input-area">
        <input type="text" id="input" placeholder="Type a message..." autofocus />
        <button id="send" onclick="sendMessage()">Send</button>
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
                        ? 'Tools: ' + data.toolCalls.map(function(t) { return t.name; }).join(', ')
                        : '';
                    var meta = data.duration + 'ms' + (data.tokensUsed ? ' | ' + data.tokensUsed + ' tokens' : '');
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
