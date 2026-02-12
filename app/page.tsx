import Link from 'next/link';

export default function HomePage() {
    return (
        <main className="min-h-screen flex flex-col">
            {/* Nav */}
            <nav className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <span className="text-lg font-bold text-gray-900 tracking-tight">
                    <span className="text-pink-500">MB</span> Agent
                </span>
                <div className="flex gap-2">
                    <Link
                        href="/api/test-chat"
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
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

            {/* Hero */}
            <div className="flex-1 flex flex-col items-center justify-center px-5 py-16">
                <div className="w-14 h-14 rounded-2xl bg-pink-500 flex items-center justify-center text-2xl text-white mb-6">
                    MB
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-3 tracking-tight">
                    MomBoss Agent Network
                </h1>
                <p className="text-gray-500 text-center max-w-md mb-10 text-sm sm:text-base">
                    WhatsApp AI backend for vendors on momboss.space — manage products, orders, marketing & insights via chat.
                </p>

                {/* Pipeline */}
                <div className="w-full max-w-lg space-y-3 mb-12">
                    {[
                        ['WhatsApp', 'Vendor sends message via Twilio'],
                        ['GPT Agent', 'Understands intent, calls tools'],
                        ['WooCommerce', 'Executes actions on WordPress'],
                        ['Reply', 'Sends formatted response back'],
                    ].map(([label, desc], i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {i + 1}
                            </div>
                            <div className="flex-1 bg-white rounded-lg px-4 py-2.5 border border-gray-100">
                                <span className="font-medium text-gray-900 text-sm">{label}</span>
                                <span className="text-gray-400 text-sm ml-2">{desc}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Agent Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-lg">
                    {[
                        ['🚀', 'LARA', 'Orders'],
                        ['🎨', 'AMY', 'Marketing'],
                        ['📊', 'MIRA', 'Insights'],
                        ['🔧', 'STEVE', 'Support'],
                        ['📅', 'LULU', 'Events'],
                        ['✈️', 'ZURI', 'Travel'],
                    ].map(([emoji, name, role]) => (
                        <div key={name} className="bg-white rounded-lg p-3 border border-gray-100 text-center">
                            <div className="text-xl mb-1">{emoji}</div>
                            <div className="font-semibold text-gray-900 text-xs">{name}</div>
                            <div className="text-gray-400 text-xs">{role}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <footer className="text-center py-4 text-xs text-gray-400 border-t border-gray-100">
                MomBoss • Next.js + GPT + WooCommerce + Twilio • Kenya 🇰🇪
            </footer>
        </main>
    );
}
