import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'MomBoss WhatsApp Agent',
    description: 'AI-powered WhatsApp assistant for MomBoss marketplace vendors',
    icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-[#faf5ff]">
                {children}
            </body>
        </html>
    );
}
