import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { SiteHeader } from '@/components/SiteHeader';
import { CartProvider } from '@/lib/cart';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });
const display = Fraunces({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: { default: 'mercado', template: '%s · mercado' },
  description: 'Productos físicos y digitales de vendedores independientes',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#faf8f5' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-dvh font-sans">
        <CartProvider>
          <SiteHeader />
          <div className="pb-20 sm:pb-10">{children}</div>
        </CartProvider>
      </body>
    </html>
  );
}
