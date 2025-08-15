// app/layout.tsx
import '../styles/globals.css'; // <-- globals.css lives under /styles

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portfolio Optimization & Risk',
  description: 'Live market dashboard with risk metrics, fundamentals, and news.',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Force dark theme site-wide; remove "dark" here if you later add a theme toggle
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}