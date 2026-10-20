import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { head, issueSignedToken, presignUrl } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
import { config } from '../config';

/** Tipos permitidos para archivos de pago. El tipo real se vuelve a verificar al registrar la versión. */
export const DIGITAL_ALLOWED_TYPES = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/epub+zip',
  'video/mp4',
  'audio/mpeg',
  'image/png',
  'image/jpeg',
];

export const MAX_DIGITAL_BYTES = 5 * 1024 ** 3; // 5 GB

/**
 * Bóveda privada sobre Vercel Blob (store con acceso "private").
 * - El vendedor sube directo desde el navegador con un token de un solo uso.
 * - El comprador nunca recibe la ruta del archivo: solo URLs firmadas de vida corta.
 */
@Injectable()
export class StorageService {
  private ensureEnabled() {
    if (!config.blob.enabled) {
      throw new ServiceUnavailableException('La bóveda de archivos no está configurada (falta BLOB_READ_WRITE_TOKEN)');
    }
  }

  /** Ruta no predecible y aislada por vendedor. */
  static vaultPath(sellerId: string, fileName: string) {
    const ext = (fileName.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
    return `vault/${sellerId}/${randomUUID()}.${ext}`;
  }

  /** Confirma que una ruta subida existe y pertenece al vendedor. */
  async inspectUpload(sellerId: string, pathname: string) {
    this.ensureEnabled();
    if (!pathname.startsWith(`vault/${sellerId}/`)) throw new Error('El archivo no pertenece a esta tienda');
    const meta = await head(pathname);
    return { size: meta.size, contentType: meta.contentType, uploadedAt: meta.uploadedAt };
  }

  /** URL de descarga firmada; caduca en VAULT_URL_TTL_SECONDS (10 min por defecto). */
  async signedVaultUrl(pathname: string) {
    this.ensureEnabled();
    const validUntil = Date.now() + config.blob.vaultTtlSeconds * 1000;
    const token = await issueSignedToken({ pathname, operations: ['get'], validUntil });
    const { presignedUrl } = await presignUrl(token, { operation: 'get', pathname, access: 'private', validUntil });
    return { url: presignedUrl, expiresAt: new Date(validUntil) };
  }
}
