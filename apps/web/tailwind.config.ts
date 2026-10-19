import type { Config } from 'tailwindcss';

/**
 * Lenguaje visual de la dualidad (ver documento de arquitectura, sección 6):
 * ámbar = físico (se envía), violeta = digital (entrega inmediata).
 * El color nunca va solo: siempre acompaña un icono y un texto.
 */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17151f',
        paper: '#faf8f5',
        physical: { DEFAULT: '#b45309', soft: '#fef3c7' },
        digital: { DEFAULT: '#6d28d9', soft: '#ede9fe' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
