'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/cart';

const NAV = [
  { href: '/', label: 'Explorar' },
  { href: '/cuenta', label: 'Mi cuenta' },
  { href: '/vendedor', label: 'Vender' },
];

export function SiteHeader() {
  const { count, ready } = useCart();
  const path = usePathname();
  if (path.startsWith('/checkout')) {
    return (
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight">mercado</Link>
        <span className="flex items-center gap-1.5 text-xs text-ink/60">
          <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          Pago seguro
        </span>
      </header>
    );
  }
  return (
    <>
    <header className="sticky top-0 z-20 border-b border-black/5 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight">mercado</Link>
        <nav className="hidden items-center gap-5 text-sm sm:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={path === n.href ? 'font-semibold' : 'text-ink/70 hover:text-ink'}>
              {n.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/carrito"
          className="relative flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm ring-1 ring-black/10"
          aria-label={`Carrito, ${count} artículos`}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6 5 3H2" /><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></svg>
          Carrito
          {ready && count > 0 && (
            <span key={count} className="animate-[pop_250ms_ease-out] rounded-full bg-ink px-1.5 text-xs font-semibold text-paper">{count}</span>
          )}
        </Link>
      </div>
    </header>
    {/* Navegación inferior en móvil: fuera del header, porque backdrop-blur cambia el contexto de "fixed" */}
    {!path.startsWith('/p/') && (
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-black/10 bg-paper/95 py-2 text-xs backdrop-blur sm:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`px-3 py-1 ${path === n.href ? 'font-semibold' : 'text-ink/60'}`}>
            {n.label}
          </Link>
        ))}
      </nav>
    )}
    </>
  );
}
