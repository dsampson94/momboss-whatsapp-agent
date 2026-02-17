'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
    conversations: { total: number; active: number };
    messages: { total: number; today: number; thisWeek: number };
    actions: { total: number; successful: number; failed: number; successRate: string };
    vendors: { verified: number };
}

interface Conversation {
    id: string;
    whatsappNumber: string;
    vendorName: string | null;
    status: string;
    messageCount: number;
    lastMessage: { content: string; direction: string; createdAt: string } | null;
    lastMessageAt: string | null;
    createdAt: string;
}

interface RecentAction {
    id: string;
    whatsappNumber: string;
    action: string;
    success: boolean;
    durationMs: number | null;
    createdAt: string;
}

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                // Pass admin key via query param for browser-based dashboard access
                const adminKey = typeof window !== 'undefined'
                    ? new URLSearchParams(window.location.search).get('key') || ''
                    : '';
                const keyParam = adminKey ? `?key=${encodeURIComponent(adminKey)}` : '';
                const [statsRes, convoRes] = await Promise.all([
                    fetch(`/api/admin/stats${keyParam}`),
                    fetch(`/api/admin/conversations${keyParam ? keyParam + '&' : '?'}limit=10`),
                ]);
                const statsData = await statsRes.json();
                const convoData = await convoRes.json();

                setStats(statsData.stats || null);
                setRecentActions(statsData.recentActions || []);
                setConversations(convoData.conversations || []);
            } catch (err) {
                console.error('Failed to load dashboard data', err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-pink-500 text-lg animate-pulse">Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="border-b border-gray-100 px-6 py-4">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <Link href="/" className="text-lg font-bold text-gray-900">
                        <span className="text-pink-500">MB</span> Dashboard
                    </Link>
                    <Link
                        href="/api/test-chat"
                        className="bg-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-pink-600 transition-colors"
                    >
                        Test Chat
                    </Link>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-8 space-y-10">
                {/* Stats row */}
                {stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <StatCard label="Conversations" value={stats.conversations.total} sub={`${stats.conversations.active} active`} />
                        <StatCard label="Messages Today" value={stats.messages.today} sub={`${stats.messages.thisWeek} this week`} />
                        <StatCard label="Tool Calls" value={stats.actions.total} sub={`${stats.actions.successRate} success`} />
                        <StatCard label="Vendors" value={stats.vendors.verified} sub="verified" />
                    </div>
                )}

                {/* Conversations */}
                <section>
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Conversations</h2>
                    {conversations.length === 0 ? (
                        <div className="bg-gray-50 rounded-xl py-12 text-center">
                            <p className="text-gray-500 text-base">No conversations yet</p>
                            <p className="text-gray-400 text-sm mt-1">Send a WhatsApp message to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {conversations.map((c) => (
                                <Link
                                    key={c.id}
                                    href={`/dashboard/conversation/${c.id}`}
                                    className="flex items-center gap-4 bg-gray-50 hover:bg-pink-50 rounded-xl px-5 py-4 transition-colors"
                                >
                                    <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center text-base font-bold flex-shrink-0">
                                        {(c.vendorName || c.whatsappNumber).charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 truncate">
                                            {c.vendorName || c.whatsappNumber}
                                        </div>
                                        <p className="text-sm text-gray-400 truncate">
                                            {c.lastMessage?.content || 'No messages'}
                                        </p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="text-xs text-gray-400">
                                            {c.lastMessageAt ? timeAgo(c.lastMessageAt) : ''}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-0.5">
                                            {c.messageCount} msg{c.messageCount !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>

                {/* Tool Actions */}
                <section>
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Tool Actions</h2>
                    {recentActions.length === 0 ? (
                        <div className="bg-gray-50 rounded-xl py-12 text-center">
                            <p className="text-gray-500 text-base">No tool calls yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recentActions.map((a) => (
                                <div key={a.id} className="flex items-center gap-4 bg-gray-50 rounded-xl px-5 py-3">
                                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${a.success ? 'bg-green-400' : 'bg-red-400'}`} />
                                    <div className="flex-1 min-w-0">
                                        <span className="font-medium text-gray-900 text-sm">{a.action}</span>
                                    </div>
                                    <div className="text-right flex-shrink-0 text-xs text-gray-400">
                                        <div>{a.durationMs ? `${a.durationMs}ms` : ''}</div>
                                        <div>{timeAgo(a.createdAt)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Quick links */}
                <section className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                    <Link href="/" className="text-sm text-gray-400 hover:text-pink-500 transition-colors">Home</Link>
                    <Link href="/api/health" className="text-sm text-gray-400 hover:text-pink-500 transition-colors">Health Check</Link>
                    <Link href="/api/test-chat" className="text-sm text-gray-400 hover:text-pink-500 transition-colors">Test Chat</Link>
                </section>
            </main>
        </div>
    );
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub: string }) {
    return (
        <div className="bg-gray-50 rounded-xl p-5">
            <div className="text-xs text-gray-400 uppercase tracking-wider">{label}</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{value}</div>
            <div className="text-sm text-gray-400 mt-1">{sub}</div>
        </div>
    );
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}
