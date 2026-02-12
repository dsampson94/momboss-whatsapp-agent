'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Message {
    id: string;
    direction: 'INBOUND' | 'OUTBOUND';
    senderType: string;
    content: string | null;
    contentType: string;
    mediaUrl: string | null;
    toolCalls: any;
    tokensUsed: number | null;
    createdAt: string;
}

interface ConversationDetail {
    id: string;
    whatsappNumber: string;
    vendorName: string | null;
    status: string;
    wpUserId: number | null;
    wpStoreId: number | null;
    messages: Message[];
    vendorLink: {
        storeName: string | null;
        verified: boolean;
        verifiedAt: string | null;
    } | null;
}

export default function ConversationPage() {
    const params = useParams();
    const id = params.id as string;
    const [conversation, setConversation] = useState<ConversationDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch(`/api/admin/conversations/${id}`);
                const data = await res.json();
                setConversation(data.conversation || null);
            } catch (err) {
                console.error('Failed to load conversation', err);
            } finally {
                setLoading(false);
            }
        }
        if (id) load();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-purple-600 text-lg animate-pulse">Loading conversation...</div>
            </div>
        );
    }

    if (!conversation) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-500 text-lg mb-4">Conversation not found</p>
                    <Link href="/dashboard" className="text-purple-600 hover:underline">
                        ← Back to dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#faf5ff]">
            {/* Header */}
            <header className="bg-white border-b border-purple-100 px-6 py-4 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-purple-600 hover:text-purple-800">
                            ← Back
                        </Link>
                        <div>
                            <h1 className="font-bold text-gray-800">
                                {conversation.vendorName || conversation.whatsappNumber}
                            </h1>
                            <p className="text-xs text-gray-400">
                                {conversation.whatsappNumber}
                                {conversation.vendorLink?.verified && (
                                    <span className="ml-2 text-green-600">
                                        ✅ Verified — {conversation.vendorLink.storeName}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <span
                        className={`text-xs px-2 py-1 rounded-full ${
                            conversation.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-700'
                                : conversation.status === 'HANDED_OFF'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                        }`}
                    >
                        {conversation.status}
                    </span>
                </div>
            </header>

            {/* Chat Messages */}
            <main className="max-w-4xl mx-auto p-6">
                <div className="space-y-4">
                    {conversation.messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.direction === 'INBOUND' ? 'justify-start' : 'justify-end'}`}
                        >
                            <div
                                className={
                                    msg.direction === 'INBOUND'
                                        ? 'chat-bubble-agent'
                                        : 'chat-bubble-user'
                                }
                            >
                                {/* Media */}
                                {msg.mediaUrl && (
                                    <div className="mb-2">
                                        <a
                                            href={msg.mediaUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-purple-600 text-xs hover:underline"
                                        >
                                            📎 View attachment
                                        </a>
                                    </div>
                                )}

                                {/* Content */}
                                {msg.content && (
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                )}

                                {/* Tool calls badge */}
                                {msg.toolCalls && (
                                    <div className="mt-2 text-xs text-purple-500">
                                        ⚡ {Array.isArray(msg.toolCalls) ? msg.toolCalls.length : 1} tool call(s)
                                    </div>
                                )}

                                {/* Timestamp */}
                                <div className="text-[10px] text-gray-400 mt-1 text-right">
                                    {new Date(msg.createdAt).toLocaleTimeString()}
                                    {msg.tokensUsed && (
                                        <span className="ml-2">🪙 {msg.tokensUsed}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {conversation.messages.length === 0 && (
                        <div className="text-center text-gray-400 py-12">
                            No messages in this conversation yet.
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
