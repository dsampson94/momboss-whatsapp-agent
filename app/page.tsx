import Link from 'next/link';

export default function HomePage() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-8">
            {/* Hero */}
            <div className="text-center max-w-2xl mx-auto">
                <h1 className="text-5xl font-bold text-purple-700 mb-4">
                    🤱💼 MomBoss Agent
                </h1>
                <p className="text-xl text-gray-600 mb-2">
                    AI Agent Network for MomBoss Marketplace — Kenya 🇰🇪
                </p>
                <p className="text-gray-500 mb-8">
                    6 AI agents managing your WooCommerce/Dokan store, orders, marketing, events, and business insights — all from WhatsApp.
                </p>

                {/* Quick Links */}
                <div className="flex flex-wrap gap-4 justify-center mb-12">
                    <Link
                        href="/dashboard"
                        className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors shadow-lg"
                    >
                        📊 Dashboard
                    </Link>
                    <Link
                        href="/api/health"
                        className="px-6 py-3 bg-white text-purple-600 border-2 border-purple-200 rounded-xl font-semibold hover:border-purple-400 transition-colors"
                    >
                        🏥 Health Check
                    </Link>
                </div>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <FeatureCard
                    emoji="�"
                    title="LARA — The MotherShip"
                    description="Order orchestration, vendor notifications, delivery tracking. All automated via WhatsApp."
                />
                <FeatureCard
                    emoji="🎨"
                    title="AMY — Marketing Wizard"
                    description="Generate marketing ads for Facebook, Instagram, and WhatsApp in seconds."
                />
                <FeatureCard
                    emoji="📊"
                    title="MIRA — The Co-Founder"
                    description="Business intelligence, trending products, pricing advice, and weekly reports."
                />
                <FeatureCard
                    emoji="🔧"
                    title="STEVE — Tech Support"
                    description="Self-healing platform monitor. Auto-fixes issues and provides vendor support."
                />
                <FeatureCard
                    emoji="📅"
                    title="LULU — Event Manager"
                    description="Create events, workshops, and webinars with ticketing. Coming Month 3."
                />
                <FeatureCard
                    emoji="✈️"
                    title="ZURI — Travel Concierge"
                    description="MB-BNB.com travel deals and vendor rewards. Coming Month 4."
                />
            </div>

            {/* How It Works */}
            <div className="mt-16 max-w-2xl mx-auto text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">How It Works</h2>
                <div className="space-y-4 text-left">
                    <Step number={1} text='Vendor sends a WhatsApp message to the MomBoss number' />
                    <Step number={2} text='Twilio forwards the message to this agent' />
                    <Step number={3} text='Claude AI understands the request and calls the right tools' />
                    <Step number={4} text='Tools interact with WordPress/WooCommerce/Dokan APIs' />
                    <Step number={5} text='The vendor gets a friendly reply on WhatsApp ✨' />
                </div>
            </div>

            {/* Footer */}
            <footer className="mt-16 text-center text-gray-400 text-sm">
                <p>MomBoss WhatsApp Agent Network • Built with Next.js, Claude AI, Twilio, n8n & WooCommerce</p>
                <p className="mt-1">Africa's First AI-Powered Women's Marketplace 🇰🇪</p>
            </footer>
        </main>
    );
}

function FeatureCard({ emoji, title, description }: { emoji: string; title: string; description: string }) {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">{emoji}</div>
            <h3 className="font-bold text-gray-800 mb-1">{title}</h3>
            <p className="text-gray-500 text-sm">{description}</p>
        </div>
    );
}

function Step({ number, text }: { number: number; text: string }) {
    return (
        <div className="flex items-start gap-4">
            <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-sm">
                {number}
            </span>
            <p className="text-gray-600 pt-1">{text}</p>
        </div>
    );
}
