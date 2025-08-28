import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ReactQueryProvider } from '@/components/react-query-provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Portfolio Optimizer',
  description: 'AI-driven portfolio optimization & risk dashboards',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-gray-50 text-gray-900 antialiased`}
      >
        <div className="max-w-7xl mx-auto p-4">
          <header className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Portfolio Optimizer</h1>
            <span className="muted">Next.js • TypeScript • Tailwind</span>
          </header>
          <ReactQueryProvider>{children}</ReactQueryProvider>
        </div>
      </body>
    </html>
  );
}
