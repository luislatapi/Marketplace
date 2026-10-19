/** Imagen de marcador de posición hasta que existan fotos reales en el CDN. */
export function ProductArt({ hue, className = '', label }: { hue: number; className?: string; label?: string }) {
  return (
    <div
      role="img"
      aria-label={label ?? 'Imagen del producto'}
      className={`relative overflow-hidden ${className}`}
      style={{ background: `linear-gradient(160deg, hsl(${hue} 45% 88%), hsl(${hue} 35% 70%))` }}
    >
      <div
        className="absolute -bottom-6 -right-6 h-2/3 w-2/3 rounded-full opacity-40"
        style={{ background: `radial-gradient(circle, hsl(${hue} 60% 96%), transparent 70%)` }}
      />
    </div>
  );
}
