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
                <div className="text-purple-600 text-lg animate-pulse">Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#faf5ff]">
            {/* Header */}
            <header className="bg-white border-b border-purple-100 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="text-2xl font-bold text-purple-700">
                            🤱💼 MomBoss Agent
                        </Link>
                        <span className="text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            Dashboard
                        </span>
                    </div>
                    <Link
                        href="/api/health"
                        className="text-sm text-gray-500 hover:text-purple-600 transition-colors"
                    >
                        🏥 Health Check
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6 space-y-8">
                {/* Stats Grid */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            label="Total Conversations"
                            value={stats.conversations.total}
                            sub={`${stats.conversations.active} active`}
                            emoji="💬"
                        />
                        <StatCard
                            label="Messages Today"
                            value={stats.messages.today}
                            sub={`${stats.messages.thisWeek} this week`}
                            emoji="📨"
                        />
                        <StatCard
                            label="Tool Actions"
                            value={stats.actions.total}
                            sub={`${stats.actions.successRate} success`}
                            emoji="⚡"
                        />
                        <StatCard
                            label="Verified Vendors"
                            value={stats.vendors.verified}
                            sub="linked accounts"
                            emoji="✅"
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Recent Conversations */}
                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Conversations</h2>
                        <div className="bg-white rounded-2xl shadow-sm border border-purple-100 divide-y divide-gray-100">
                            {conversations.length === 0 ? (
                                <div className="p-6 text-center text-gray-400">
                                    No conversations yet. Send a WhatsApp message to get started!
                                </div>
                            ) : (
                                conversations.map((c) => (
                                    <Link
                                        key={c.id}
                                        href={`/dashboard/conversation/${c.id}`}
                                        className="block p-4 hover:bg-purple-50 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-semibold text-gray-800">
                                                {c.vendorName || c.whatsappNumber}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {c.lastMessageAt
                                                    ? new Date(c.lastMessageAt).toLocaleString()
                                                    : '—'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-gray-500 truncate max-w-[300px]">
                                                {c.lastMessage?.content || 'No messages'}
                                            </p>
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                {c.messageCount} msgs
                                            </span>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </section>

                    {/* Recent Actions */}
                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Tool Actions</h2>
                        <div className="bg-white rounded-2xl shadow-sm border border-purple-100 divide-y divide-gray-100">
                            {recentActions.length === 0 ? (
                                <div className="p-6 text-center text-gray-400">
                                    No actions yet. The AI agent will log tool calls here.
                                </div>
                            ) : (
                                recentActions.map((a) => (
                                    <div key={a.id} className="p-4">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className={a.success ? 'text-green-500' : 'text-red-500'}>
                                                    {a.success ? '✅' : '❌'}
                                                </span>
                                                <span className="font-mono text-sm font-medium text-gray-800">
                                                    {a.action}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-400">
                                                {a.durationMs ? `${a.durationMs}ms` : '—'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {a.whatsappNumber} • {new Date(a.createdAt).toLocaleString()}
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

function StatCard({
    label,
    value,
    sub,
    emoji,
}: {
    label: string;
    value: number | string;
    sub: string;
    emoji: string;
}) {
    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-purple-100">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">{label}</span>
                <span className="text-2xl">{emoji}</span>
            </div>
            <div className="text-3xl font-bold text-gray-800">{value}</div>
            <div className="text-xs text-gray-400 mt-1">{sub}</div>
        </div>
    );
}
