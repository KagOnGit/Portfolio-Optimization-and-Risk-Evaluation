import './globals.css';
import type { Metadata } from 'next';

export const meta Metadata = {
  title: 'Flagship Portfolio Optimizer',
  description: 'MBA-ready portfolio optimization & risk dashboard'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
