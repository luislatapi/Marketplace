'use client';

export function QtyStepper({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="inline-flex items-center rounded-full ring-1 ring-black/15">
      <button type="button" aria-label="Quitar uno" onClick={() => onChange(value - 1)} className="h-8 w-8 text-lg leading-none">−</button>
      <span className="w-6 text-center text-sm tabular-nums" aria-live="polite">{value}</span>
      <button
        type="button"
        aria-label="Agregar uno"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="h-8 w-8 text-lg leading-none disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}
