import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeProvider } from 'next-themes';
import { ReactQueryProvider } from '@/components/react-query-provider';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'Portfolio Optimizer',
  description: 'AI-driven portfolio optimization & risk dashboards',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ReactQueryProvider>
            <div className="flex flex-col min-h-dvh max-w-7xl mx-auto">
              <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                <h1 className="text-2xl font-bold">Portfolio Optimizer</h1>
                <nav className="space-x-4 text-sm">
                  <Link href="/" className="hover:underline">Dashboard</Link>
                  <Link href="/optimize" className="hover:underline">Optimizer</Link>
                  <Link href="/factors" className="hover:underline">Factors</Link>
                </nav>
                <ThemeToggle />
              </header>
              <main className="flex-1 p-4">{children}</main>
              <footer className="p-4 text-xs text-center text-gray-500 border-t border-gray-200 dark:border-gray-800">
                © {new Date().getFullYear()} Portfolio Optimizer · Next.js · Tailwind · TypeScript
              </footer>
            </div>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
