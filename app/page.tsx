import Link from 'next/link';

export default function HomePage() {
    return (
        <main className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <nav className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">
                    <span className="text-pink-500">MB</span> Agent
                </span>
                <Link
                    href="/dashboard"
                    className="text-sm text-gray-500 hover:text-gray-900"
                >
                    Dashboard
                </Link>
            </nav>

            {/* Main */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 max-w-xl mx-auto text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                    MomBoss WhatsApp Agent
                </h1>
                <p className="text-gray-500 mb-10 leading-relaxed">
                    Send a WhatsApp message, get an AI-powered reply. Manage your store, orders, products, and marketing — all through chat.
                </p>

                {/* Big CTA */}
                <Link
                    href="/api/test-chat"
                    className="w-full max-w-xs bg-pink-500 text-white text-center py-4 rounded-xl text-lg font-semibold hover:bg-pink-600 transition-colors mb-4"
                >
                    Try the Agent
                </Link>
                <p className="text-xs text-gray-400 mb-16">Opens a test chat in your browser — no WhatsApp needed</p>

                {/* What it does */}
                <div className="w-full text-left space-y-4">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">What it does</h2>
                    <div className="grid gap-3">
                        {[
                            ['Products', 'Create, edit, and manage your store listings'],
                            ['Orders', 'View order details and update status'],
                            ['Marketing', 'Generate ad copy for your products'],
                            ['Insights', 'Get business advice and pricing tips'],
                            ['Events', 'Create workshops and meetups'],
                            ['Support', 'Get help with platform issues'],
                        ].map(([title, desc]) => (
                            <div key={title} className="flex items-start gap-3 bg-gray-50 rounded-xl px-4 py-3">
                                <div className="w-2 h-2 rounded-full bg-pink-400 mt-1.5 flex-shrink-0" />
                                <div>
                                    <div className="text-sm font-medium text-gray-900">{title}</div>
                                    <div className="text-xs text-gray-500">{desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* How it works */}
                <div className="w-full text-left mt-12 space-y-4">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">How it works</h2>
                    <div className="flex flex-col gap-2">
                        {[
                            'You send a WhatsApp message',
                            'AI understands what you need',
                            'It calls the right tools (WooCommerce, etc.)',
                            'You get a reply with the result',
                        ].map((step, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                    {i + 1}
                                </span>
                                <span className="text-sm text-gray-700">{step}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tech */}
                <div className="w-full text-left mt-12">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Built with</h2>
                    <p className="text-sm text-gray-500">
                        Next.js, OpenAI GPT-4o, Twilio, WooCommerce, PostgreSQL, TypeScript
                    </p>
                </div>
            </div>

            <footer className="py-4 text-center text-xs text-gray-300 border-t border-gray-50">
                momboss.space
            </footer>
        </main>
    );
}
