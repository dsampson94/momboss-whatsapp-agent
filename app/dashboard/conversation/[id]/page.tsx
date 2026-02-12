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
                <div className="text-pink-500 text-sm animate-pulse">Loading...</div>
            </div>
        );
    }

    if (!conversation) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-3">
                <p className="text-gray-400 text-sm">Conversation not found</p>
                <Link href="/dashboard" className="text-pink-500 text-sm hover:underline">
                    ← Back
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link href="/dashboard" className="text-pink-500 hover:text-pink-600 text-sm flex-shrink-0">
                            ←
                        </Link>
                        <div className="w-7 h-7 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {(conversation.vendorName || conversation.whatsappNumber).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <h1 className="font-medium text-gray-900 text-sm truncate">
                                {conversation.vendorName || conversation.whatsappNumber}
                            </h1>
                            <p className="text-[10px] text-gray-400 truncate">
                                {conversation.whatsappNumber}
                                {conversation.vendorLink?.verified && (
                                    <span className="ml-1.5 text-green-500">
                                        ✓ {conversation.vendorLink.storeName}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                            conversation.status === 'ACTIVE'
                                ? 'bg-green-50 text-green-600'
                                : conversation.status === 'HANDED_OFF'
                                ? 'bg-amber-50 text-amber-600'
                                : 'bg-gray-100 text-gray-500'
                        }`}
                    >
                        {conversation.status}
                    </span>
                </div>
            </header>

            {/* Messages */}
            <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-4">
                <div className="space-y-3">
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
                                {msg.mediaUrl && (
                                    <a
                                        href={msg.mediaUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-pink-500 text-xs hover:underline block mb-1"
                                    >
                                        Attachment
                                    </a>
                                )}

                                {msg.content && (
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                )}

                                {msg.toolCalls && (
                                    <div className="mt-1.5 text-[10px] text-pink-400 font-medium">
                                        {Array.isArray(msg.toolCalls) ? msg.toolCalls.length : 1} tool call(s)
                                    </div>
                                )}

                                <div className={`text-[10px] mt-1 ${msg.direction === 'INBOUND' ? 'text-gray-400' : 'text-pink-200'} text-right`}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {msg.tokensUsed ? ` · ${msg.tokensUsed} tok` : ''}
                                </div>
                            </div>
                        </div>
                    ))}

                    {conversation.messages.length === 0 && (
                        <div className="text-center text-gray-400 text-sm py-16">
                            No messages yet.
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
