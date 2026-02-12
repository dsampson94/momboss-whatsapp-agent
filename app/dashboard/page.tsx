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
                const [statsRes, convoRes] = await Promise.all([
                    fetch('/api/admin/stats'),
                    fetch('/api/admin/conversations?limit=10'),
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
                <div className="text-pink-500 text-sm animate-pulse">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link href="/" className="text-lg font-bold text-gray-900 tracking-tight">
                            <span className="text-pink-500">MB</span> Agent
                        </Link>
                        <span className="text-[10px] bg-pink-50 text-pink-500 px-1.5 py-0.5 rounded font-medium">
                            DASH
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href="/api/test-chat"
                            className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 transition-colors"
                        >
                            Test Chat
                        </Link>
                        <Link
                            href="/api/health"
                            className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 transition-colors"
                        >
                            Health
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* Stats */}
                {stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatCard label="Conversations" value={stats.conversations.total} sub={`${stats.conversations.active} active`} />
                        <StatCard label="Messages Today" value={stats.messages.today} sub={`${stats.messages.thisWeek} this week`} />
                        <StatCard label="Tool Calls" value={stats.actions.total} sub={`${stats.actions.successRate} ok`} />
                        <StatCard label="Vendors" value={stats.vendors.verified} sub="verified" />
                    </div>
                )}

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Conversations — takes 3/5 */}
                    <section className="lg:col-span-3">
                        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Conversations</h2>
                        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                            {conversations.length === 0 ? (
                                <div className="px-4 py-10 text-center text-gray-400 text-sm">
                                    No conversations yet. Send a WhatsApp message to get started.
                                </div>
                            ) : (
                                conversations.map((c) => (
                                    <Link
                                        key={c.id}
                                        href={`/dashboard/conversation/${c.id}`}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-pink-50/50 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                            {(c.vendorName || c.whatsappNumber).charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-medium text-gray-900 text-sm truncate">
                                                    {c.vendorName || c.whatsappNumber}
                                                </span>
                                                <span className="text-[10px] text-gray-400 flex-shrink-0">
                                                    {c.lastMessageAt
                                                        ? timeAgo(c.lastMessageAt)
                                                        : '—'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 truncate mt-0.5">
                                                {c.lastMessage?.content || 'No messages'}
                                            </p>
                                        </div>
                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex-shrink-0">
                                            {c.messageCount}
                                        </span>
                                    </Link>
                                ))
                            )}
                        </div>
                    </section>

                    {/* Actions — takes 2/5 */}
                    <section className="lg:col-span-2">
                        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tool Actions</h2>
                        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                            {recentActions.length === 0 ? (
                                <div className="px-4 py-10 text-center text-gray-400 text-sm">
                                    No tool calls yet.
                                </div>
                            ) : (
                                recentActions.map((a) => (
                                    <div key={a.id} className="px-4 py-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${a.success ? 'bg-green-400' : 'bg-red-400'}`} />
                                                <span className="font-mono text-xs text-gray-800">
                                                    {a.action}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-gray-400">
                                                {a.durationMs ? `${a.durationMs}ms` : '—'}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-0.5 pl-3">
                                            {timeAgo(a.createdAt)}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub: string }) {
    return (
        <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>
        </div>
    );
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
}
