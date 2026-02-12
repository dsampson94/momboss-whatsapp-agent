import Link from 'next/link';

export default function HomePage() {
    return (
        <main className="min-h-screen flex flex-col bg-white">
            {/* Nav */}
            <nav className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
                <span className="text-lg font-bold text-gray-900 tracking-tight">
                    <span className="text-pink-500">MB</span> Agent
                </span>
                <div className="flex gap-2">
                    <Link
                        href="/api/test-chat"
                        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        Test Chat
                    </Link>
                    <Link
                        href="/dashboard"
                        className="px-3 py-1.5 text-sm bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
                    >
                        Dashboard
                    </Link>
                </div>
            </nav>

            {/* README Content */}
            <article className="flex-1 max-w-3xl mx-auto w-full px-5 py-10">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">MomBoss WhatsApp Agent</h1>
                <p className="text-gray-500 text-sm mb-8">
                    AI-powered WhatsApp assistant for vendors on{' '}
                    <a href="https://momboss.space" className="text-pink-500 hover:underline" target="_blank" rel="noopener noreferrer">momboss.space</a>
                    {' '}&mdash; Africa&apos;s first women-focused multi-vendor marketplace.
                </p>

                <p className="text-gray-600 text-sm mb-8">
                    Vendors message a WhatsApp number. An AI agent understands what they need, calls the right tools, and replies &mdash; all in one conversation.
                </p>

                {/* Pipeline */}
                <h2 className="text-base font-semibold text-gray-900 mb-3">How It Works</h2>
                <div className="space-y-2 mb-8">
                    {[
                        ['1', 'WhatsApp Message', 'Vendor sends a message via Twilio'],
                        ['2', 'GPT-4o Agent', 'Understands intent, selects tools'],
                        ['3', 'WooCommerce APIs', 'Executes actions on WordPress'],
                        ['4', 'TwiML Response', 'Sends reply back to WhatsApp'],
                    ].map(([num, label, desc]) => (
                        <div key={num} className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-md bg-pink-50 text-pink-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {num}
                            </div>
                            <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                                <span className="font-medium text-gray-900 text-sm">{label}</span>
                                <span className="text-gray-400 text-sm ml-2">{desc}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Capabilities */}
                <h2 className="text-base font-semibold text-gray-900 mb-3">What The Agent Can Do</h2>
                <div className="overflow-x-auto mb-8">
                    <table className="w-full text-sm border border-gray-100 rounded-lg">
                        <thead>
                            <tr className="bg-gray-50 text-left">
                                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Area</th>
                                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Capabilities</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {[
                                ['Products', 'Create, list, view, update (name, price, stock, status, images)'],
                                ['Orders', 'List, view details, update status'],
                                ['Categories', 'Browse product categories'],
                                ['Store', 'View vendor profile and sales stats'],
                                ['Events', 'Create workshops, meetups, webinars'],
                                ['Advertising', 'Generate marketing copy for products'],
                                ['Insights', 'Business advice, trends, pricing tips'],
                                ['Support', 'Platform help and troubleshooting'],
                                ['Verification', 'Link WhatsApp number to vendor store'],
                            ].map(([area, caps]) => (
                                <tr key={area}>
                                    <td className="px-3 py-2 font-medium text-gray-900">{area}</td>
                                    <td className="px-3 py-2 text-gray-600">{caps}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Agent Roles */}
                <h2 className="text-base font-semibold text-gray-900 mb-3">Agent Roles</h2>
                <p className="text-gray-600 text-sm mb-3">The agent combines multiple specialist roles into one interface:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8">
                    {[
                        ['LARA', 'Orders & delivery'],
                        ['AMY', 'Marketing & ads'],
                        ['MIRA', 'Business insights'],
                        ['STEVE', 'Tech support'],
                        ['LULU', 'Events'],
                        ['ZURI', 'Travel (soon)'],
                    ].map(([name, role]) => (
                        <div key={name} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                            <div className="font-semibold text-gray-900 text-xs">{name}</div>
                            <div className="text-gray-400 text-xs">{role}</div>
                        </div>
                    ))}
                </div>

                {/* Tech Stack */}
                <h2 className="text-base font-semibold text-gray-900 mb-3">Tech Stack</h2>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 mb-8">
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                        {[
                            ['Runtime', 'Next.js 15 on Vercel'],
                            ['AI', 'OpenAI GPT-4o'],
                            ['Messaging', 'Twilio WhatsApp API'],
                            ['Commerce', 'WooCommerce + Dokan'],
                            ['Database', 'PostgreSQL (Neon)'],
                            ['Language', 'TypeScript'],
                        ].map(([label, value]) => (
                            <div key={label}>
                                <span className="text-gray-400">{label}:</span>{' '}
                                <span className="text-gray-900 font-medium">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Architecture */}
                <h2 className="text-base font-semibold text-gray-900 mb-3">Architecture</h2>
                <pre className="bg-gray-900 text-gray-300 rounded-lg p-4 text-xs overflow-x-auto mb-8 leading-relaxed">
{`app/
  api/
    whatsapp/route.ts    Twilio webhook (POST/GET)
    test-chat/route.ts   Browser test chat UI
    health/route.ts      Health check
    admin/               Dashboard API
    webhooks/            WooCommerce & n8n hooks
  lib/
    agent.ts             AI engine (GPT + tool loop)
    tools.ts             Tool definitions
    tool-executor.ts     Maps tools to API calls
    wordpress.ts         WooCommerce/Dokan client
    conversation.ts      Conversation storage
    twilio.ts            Twilio messaging
  dashboard/             Admin dashboard UI
prisma/
  schema.prisma          Database schema`}
                </pre>

                {/* Market */}
                <h2 className="text-base font-semibold text-gray-900 mb-3">Market</h2>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 text-sm space-y-1 mb-8">
                    <div><span className="text-gray-400">Platform:</span> <span className="text-gray-900">momboss.space</span></div>
                    <div><span className="text-gray-400">Region:</span> <span className="text-gray-900">Kenya</span></div>
                    <div><span className="text-gray-400">Currency:</span> <span className="text-gray-900">KES (Kenyan Shilling)</span></div>
                    <div><span className="text-gray-400">Payments:</span> <span className="text-gray-900">M-Pesa, PayPal</span></div>
                    <div><span className="text-gray-400">Target:</span> <span className="text-gray-900">Women entrepreneurs</span></div>
                </div>
            </article>

            {/* Footer */}
            <footer className="text-center py-4 text-xs text-gray-400 border-t border-gray-100">
                MomBoss &middot; Next.js + GPT + WooCommerce + Twilio
            </footer>
        </main>
    );
}
