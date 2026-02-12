import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
    title: 'MomBoss Agent',
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
            <body className="min-h-screen bg-gray-50">
                {children}
                <Analytics />
            </body>
        </html>
    );
}
