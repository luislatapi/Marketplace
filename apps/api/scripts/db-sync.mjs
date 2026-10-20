// Sincroniza el esquema de Prisma con la base de datos durante el build de Vercel.
// - Sin DATABASE_URL (p. ej. en una vista previa sin base) se omite.
// - Nunca acepta pérdida de datos: si un cambio borraría columnas, el build falla y avisa.
// En la Fase 2 esto se reemplaza por migraciones versionadas (prisma migrate deploy).
import { execSync } from 'node:child_process';

if (!process.env.DATABASE_URL) {
  console.log('[db-sync] Sin DATABASE_URL: se omite la sincronización del esquema.');
  process.exit(0);
}

execSync('npm --prefix ../.. run db:push', { stdio: 'inherit' });
console.log('[db-sync] Esquema sincronizado.');
