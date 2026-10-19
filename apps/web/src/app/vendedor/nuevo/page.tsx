'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { DeliveryBadge } from '@/components/DeliveryBadge';
import { CATEGORIES } from '@/lib/catalog';
import { formatMoney } from '@/lib/format';
import { commissionCents, saveDraft } from '@/lib/seller';

type Mode = 'physical' | 'digital' | 'both';
type ScanState = 'idle' | 'uploading' | 'scanning' | 'clean';

const field = 'w-full rounded-xl bg-white px-4 py-3 text-base ring-1 ring-black/15 focus:outline-none focus:ring-2 focus:ring-ink';

const MODES: { id: Mode; title: string; text: string }[] = [
  { id: 'physical', title: 'Físico', text: 'Se envía a domicilio. Pide stock, peso y medidas.' },
  { id: 'digital', title: 'Digital', text: 'Archivo, curso o software. Se entrega al instante.' },
  { id: 'both', title: 'Ambos', text: 'Mismo producto en dos formatos, p. ej. libro impreso y PDF.' },
];

function pesosToCents(v: string) {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

export default function NewProductPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [digitalPrice, setDigitalPrice] = useState('');
  const [stock, setStock] = useState('');
  const [weight, setWeight] = useState('');
  const [maxDownloads, setMaxDownloads] = useState('5');
  const [file, setFile] = useState<File | null>(null);
  const [scan, setScan] = useState<ScanState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const hasPhysical = mode === 'physical' || mode === 'both';
  const hasDigital = mode === 'digital' || mode === 'both';
  const mainCents = pesosToCents(price);
  const digitalCents = mode === 'both' ? pesosToCents(digitalPrice) : mainCents;

  // Subida simulada: en producción va directo a S3 (cuarentena) con URL prefirmada y luego se escanea.
  function onFile(f: File | null) {
    setFile(f);
    if (!f) return setScan('idle');
    setScan('uploading');
    setProgress(0);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer.current!);
          setScan('scanning');
          setTimeout(() => setScan('clean'), 1400);
          return 100;
        }
        return p + 10;
      });
    }, 120);
  }

  function submit() {
    const problems = [
      !mode && 'Elige el tipo de producto.',
      title.trim().length < 3 && 'El nombre debe tener al menos 3 caracteres.',
      !mainCents && 'Escribe un precio válido.',
      mode === 'both' && !digitalCents && 'Escribe el precio de la versión digital.',
      hasPhysical && !(Number(stock) >= 0 && stock !== '') && 'Indica el stock.',
      hasPhysical && !(Number(weight) > 0) && 'Indica el peso en gramos para cotizar el envío.',
      hasDigital && scan !== 'clean' && 'Sube el archivo y espera a que termine la revisión.',
    ].filter(Boolean) as string[];
    if (problems.length) return setError(problems[0]);

    saveDraft({
      id: `draft_${Date.now().toString(36)}`,
      title: title.trim(),
      mode: mode!,
      priceCents: mainCents,
      digitalPriceCents: mode === 'both' ? digitalCents : undefined,
      createdAt: new Date().toISOString(),
      status: 'in_review',
    });
    router.push('/vendedor');
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6">
      <Link href="/vendedor" className="text-sm text-ink/60">← Panel</Link>
      <h1 className="mt-2 font-display text-2xl">Nuevo producto</h1>

      <fieldset className="mt-5">
        <legend className="font-medium">1. ¿Qué vas a vender?</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              aria-pressed={mode === m.id}
              className={`rounded-2xl bg-white p-4 text-left ring-1 transition ${mode === m.id ? 'ring-2 ring-ink' : 'ring-black/10'}`}
            >
              <DeliveryBadge kind={m.id} compact />
              <p className="mt-2 font-medium">{m.title}</p>
              <p className="mt-0.5 text-xs text-ink/60">{m.text}</p>
            </button>
          ))}
        </div>
      </fieldset>

      {mode && (
        <div className="animate-rise mt-6 space-y-6">
          <section className="space-y-3">
            <h2 className="font-medium">2. Información</h2>
            <input className={field} placeholder="Nombre del producto" value={title} onChange={(e) => setTitle(e.target.value)} />
            <select className={field} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoría">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <textarea className={`${field} min-h-24`} placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="rounded-xl border border-dashed border-black/20 p-4 text-center text-sm text-ink/60">
              Fotos del producto (hasta 8) · se publican en el CDN público
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-medium">3. Precio</h2>
            <div className={`grid gap-3 ${mode === 'both' ? 'sm:grid-cols-2' : ''}`}>
              <label className="text-sm">
                {mode === 'both' ? 'Precio versión física (MXN)' : 'Precio (MXN)'}
                <input className={`${field} mt-1`} inputMode="decimal" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} />
              </label>
              {mode === 'both' && (
                <label className="text-sm">
                  Precio versión digital (MXN)
                  <input className={`${field} mt-1`} inputMode="decimal" placeholder="0.00" value={digitalPrice} onChange={(e) => setDigitalPrice(e.target.value)} />
                </label>
              )}
            </div>
            {mainCents > 0 && (
              <p className="rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-black/5">
                Por cada venta de {formatMoney(mainCents)} recibes <strong>{formatMoney(mainCents - commissionCents(mainCents))}</strong>
                <span className="text-ink/60"> (comisión 15 %: {formatMoney(commissionCents(mainCents))}). El envío lo recibes completo.</span>
              </p>
            )}
          </section>

          {hasPhysical && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 font-medium">4. Inventario y envío <DeliveryBadge kind="physical" compact /></h2>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">Stock<input className={`${field} mt-1`} inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ''))} /></label>
                <label className="text-sm">Peso (g)<input className={`${field} mt-1`} inputMode="numeric" value={weight} onChange={(e) => setWeight(e.target.value.replace(/\D/g, ''))} /></label>
              </div>
              <p className="text-xs text-ink/60">Las variantes (talla, color) se agregan después de publicar.</p>
            </section>
          )}

          {hasDigital && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 font-medium">{hasPhysical ? '5' : '4'}. Archivo digital <DeliveryBadge kind="digital" compact /></h2>
              <label className="block cursor-pointer rounded-xl border border-dashed border-digital/40 bg-digital-soft/50 p-4 text-sm">
                <input type="file" className="sr-only" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
                {file ? <span className="font-medium">{file.name}</span> : 'Elegir archivo (PDF, ZIP, video…)'}
                <span className="block text-xs text-ink/60">En esta demo el archivo no sale de tu navegador.</span>
              </label>
              {scan !== 'idle' && (
                <div className="text-sm" aria-live="polite">
                  <div className="h-1.5 overflow-hidden rounded-full bg-black/10">
                    <div className={`h-full transition-all ${scan === 'clean' ? 'bg-emerald-600' : 'bg-digital'}`} style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-ink/70">
                    {scan === 'uploading' && `Subiendo a la bóveda privada… ${progress} %`}
                    {scan === 'scanning' && 'Revisando antivirus y contenido…'}
                    {scan === 'clean' && 'Archivo verificado ✓ · nunca tendrá un enlace público'}
                  </p>
                </div>
              )}
              <label className="text-sm">
                Límite de descargas por comprador
                <select className={`${field} mt-1`} value={maxDownloads} onChange={(e) => setMaxDownloads(e.target.value)}>
                  <option value="3">3</option>
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="0">Ilimitadas</option>
                </select>
              </label>
            </section>
          )}

          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button onClick={submit} className="w-full rounded-xl bg-ink py-3.5 font-medium text-paper">Enviar a revisión</button>
          <p className="text-center text-xs text-ink/50">Tus primeros productos los revisa el equipo antes de publicarse.</p>
        </div>
      )}
    </main>
  );
}
