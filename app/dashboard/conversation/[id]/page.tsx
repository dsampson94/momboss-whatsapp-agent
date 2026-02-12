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
                <p className="text-pink-500 text-lg animate-pulse">Loading conversation...</p>
            </div>
        );
    }

    if (!conversation) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-gray-500 text-base">Conversation not found</p>
                <Link href="/dashboard" className="text-pink-500 hover:underline">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <header className="border-b border-gray-100 px-6 py-4 sticky top-0 z-10 bg-white">
                <div className="max-w-3xl mx-auto flex items-center gap-4">
                    <Link href="/dashboard" className="text-pink-500 hover:text-pink-600 text-lg font-bold">
                        &larr;
                    </Link>
                    <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center text-base font-bold flex-shrink-0">
                        {(conversation.vendorName || conversation.whatsappNumber).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="font-bold text-gray-900 truncate">
                            {conversation.vendorName || conversation.whatsappNumber}
                        </h1>
                        <p className="text-sm text-gray-400 truncate">
                            {conversation.whatsappNumber}
                            {conversation.vendorLink?.verified && (
                                <span className="ml-2 text-green-500 font-medium">
                                    Verified
                                </span>
                            )}
                        </p>
                    </div>
                    <span
                        className={`text-xs px-2 py-1 rounded-lg font-medium flex-shrink-0 ${
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
            <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-6">
                <div className="space-y-4">
                    {conversation.messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.direction === 'INBOUND' ? 'justify-start' : 'justify-end'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                                    msg.direction === 'INBOUND'
                                        ? 'bg-gray-50 text-gray-900'
                                        : 'bg-pink-500 text-white'
                                }`}
                            >
                                {msg.mediaUrl && (
                                    <a
                                        href={msg.mediaUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`text-sm underline block mb-1 ${msg.direction === 'INBOUND' ? 'text-pink-500' : 'text-pink-100'}`}
                                    >
                                        View attachment
                                    </a>
                                )}

                                {msg.content && (
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                )}

                                {msg.toolCalls && (
                                    <div className={`mt-2 text-xs font-medium ${msg.direction === 'INBOUND' ? 'text-pink-400' : 'text-pink-200'}`}>
                                        {Array.isArray(msg.toolCalls) ? msg.toolCalls.length : 1} tool call(s)
                                    </div>
                                )}

                                <div className={`text-xs mt-2 text-right ${msg.direction === 'INBOUND' ? 'text-gray-400' : 'text-pink-200'}`}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))}

                    {conversation.messages.length === 0 && (
                        <div className="text-center text-gray-400 py-20">
                            <p className="text-base">No messages yet</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
