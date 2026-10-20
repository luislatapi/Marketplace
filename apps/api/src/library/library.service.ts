import { ForbiddenException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { StorageService } from '../storage/storage.service';

/** Motivo por el que un derecho de acceso no permite descargar, o null si sí puede. */
export function downloadBlocker(e: { status: string; expiresAt: Date | null; downloadsUsed: number; maxDownloads: number | null }, now = new Date()) {
  if (e.status === 'revoked') return 'Este acceso fue revocado';
  if (e.status !== 'active') return 'Este acceso está suspendido mientras se revisa una disputa';
  if (e.expiresAt && e.expiresAt <= now) return 'Tu acceso a este producto venció';
  if (e.maxDownloads !== null && e.downloadsUsed >= e.maxDownloads) return 'Alcanzaste el límite de descargas';
  return null;
}

@Injectable()
export class LibraryService {
  constructor(private readonly db: PrismaService, private readonly storage: StorageService) {}

  async list(buyerId: string) {
    const rows = await this.db.entitlement.findMany({
      where: { buyerId, status: { not: 'revoked' } },
      orderBy: { grantedAt: 'desc' },
      include: {
        asset: { include: { versions: { where: { isCurrent: true }, select: { versionLabel: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true } } } },
        orderItem: { select: { titleSnapshot: true, sellerOrder: { select: { order: { select: { number: true } }, seller: { select: { storeName: true } } } } } },
      },
    });
    return rows.map((e) => ({
      id: e.id,
      title: e.orderItem.titleSnapshot,
      seller: e.orderItem.sellerOrder.seller.storeName,
      orderNumber: e.orderItem.sellerOrder.order.number,
      licenseKey: e.licenseKey,
      status: e.status,
      grantedAt: e.grantedAt,
      expiresAt: e.expiresAt,
      downloadsUsed: e.downloadsUsed,
      maxDownloads: e.maxDownloads,
      currentVersion: e.asset.versions[0] ?? null,
      blockedReason: downloadBlocker(e),
    }));
  }

  /**
   * Emite un enlace firmado de vida corta. El contador sube de forma atómica
   * (dos clics simultáneos no pueden pasarse del límite).
   */
  async download(buyerId: string, entitlementId: string, meta: { ip?: string; userAgent?: string }) {
    const e = await this.db.entitlement.findFirst({
      where: { id: entitlementId, buyerId },
      include: { asset: { include: { versions: { where: { isCurrent: true } } } } },
    });
    if (!e) throw new NotFoundException('No encontramos esa compra en tu biblioteca');
    const blocked = downloadBlocker(e);
    if (blocked) throw new ForbiddenException(blocked);

    const version = e.asset.versions[0];
    if (!version || !['clean', 'approved'].includes(version.scanStatus)) throw new GoneException('El archivo no está disponible temporalmente');

    const claimed = await this.db.$executeRaw`
      UPDATE entitlements SET downloads_used = downloads_used + 1
      WHERE id = ${e.id}::uuid AND status = 'active'
        AND (max_downloads IS NULL OR downloads_used < max_downloads)`;
    if (claimed !== 1) throw new ForbiddenException('Alcanzaste el límite de descargas');

    await this.db.downloadEvent.create({ data: { entitlementId: e.id, versionId: version.id, ip: meta.ip, userAgent: meta.userAgent?.slice(0, 300) } });
    const signed = await this.storage.signedVaultUrl(version.storageKey);
    return { url: signed.url, expiresAt: signed.expiresAt, fileName: version.fileName, versionLabel: version.versionLabel };
  }
}
