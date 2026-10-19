import { SHIPMENT_STEPS } from '@/lib/orders';

export function ShipmentTimeline({ step }: { step: 0 | 1 | 2 | 3 }) {
  return (
    <ol className="mt-3 flex items-center gap-1" aria-label={`Estado: ${SHIPMENT_STEPS[step]}`}>
      {SHIPMENT_STEPS.map((label, i) => (
        <li key={label} className="flex flex-1 flex-col gap-1">
          <span className={`h-1.5 rounded-full ${i <= step ? 'bg-physical' : 'bg-black/10'}`} />
          <span className={`text-[11px] ${i === step ? 'font-semibold text-ink' : 'text-ink/50'}`}>{label}</span>
        </li>
      ))}
    </ol>
  );
}
