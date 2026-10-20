/**
 * Diagnóstico TEMPORAL: consulta rutas públicas de la API y devuelve estado y cuerpo,
 * para depurar la publicación sin acceso a los registros de Vercel. Se elimina después.
 */
export const dynamic = 'force-dynamic';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://marketplace-psi-eight-80.vercel.app';
const PATHS = ['/health', '/products', '/products/categories'];

export async function GET() {
  const results = await Promise.all(
    PATHS.map(async (path) => {
      const started = Date.now();
      try {
        const res = await fetch(`${API}${path}`, { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
        const body = (await res.text()).slice(0, 1500);
        return { path, status: res.status, ms: Date.now() - started, headers: { server: res.headers.get('server'), 'x-vercel-error': res.headers.get('x-vercel-error') }, body };
      } catch (e) {
        return { path, error: (e as Error).message, ms: Date.now() - started };
      }
    }),
  );
  return Response.json({ api: API, results });
}
