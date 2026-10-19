type Kind = 'physical' | 'digital' | 'both';

function TruckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
      <circle cx="7" cy="17.5" r="1.5" />
      <circle cx="17" cy="17.5" r="1.5" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  );
}

const LABELS: Record<Kind, string> = {
  physical: 'Envío a domicilio',
  digital: 'Entrega inmediata',
  both: 'Impreso y digital',
};

/** Insignia que dice, sin leer, si algo llega a casa o al correo. Icono + texto + color. */
export function DeliveryBadge({ kind, compact = false }: { kind: Kind; compact?: boolean }) {
  if (kind === 'both') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-ink ring-1 ring-black/10">
        <span className="text-physical"><TruckIcon /></span>
        <span className="text-digital"><BoltIcon /></span>
        {!compact && LABELS.both}
      </span>
    );
  }
  const styles = kind === 'physical' ? 'bg-physical-soft text-physical' : 'bg-digital-soft text-digital';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>
      {kind === 'physical' ? <TruckIcon /> : <BoltIcon />}
      {!compact && LABELS[kind]}
    </span>
  );
}
