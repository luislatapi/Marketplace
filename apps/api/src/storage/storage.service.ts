import { Injectable } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import type { UploadRequest } from '@mkt/shared';
import { config } from '../config';

export type UploadPurpose = UploadRequest['purpose'];

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

/**
 * Dos mundos aislados:
 *  - Público (CDN): fotos y muestras gratuitas.
 *  - Privado: archivos de pago entran a cuarentena, se escanean y pasan a la bóveda.
 * El comprador nunca recibe una URL permanente de la bóveda, solo firmas de vida corta.
 */
@Injectable()
export class StorageService {
  private readonly s3 = new S3Client({
    region: config.s3.region,
    endpoint: config.s3.endpoint,
    forcePathStyle: Boolean(config.s3.endpoint), // MinIO en local
    credentials:
      config.s3.accessKeyId && config.s3.secretAccessKey
        ? { accessKeyId: config.s3.accessKeyId, secretAccessKey: config.s3.secretAccessKey }
        : undefined,
  });

  /** Decide bucket y clave según el propósito. Las claves nunca son predecibles. */
  static target(purpose: UploadPurpose, sellerId: string, fileName: string, mimeType: string) {
    const ext = (fileName.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
    const id = randomUUID();
    switch (purpose) {
      case 'product_image':
        if (!IMAGE_TYPES.includes(mimeType)) throw new Error('Formato de imagen no permitido');
        return { bucket: config.s3.buckets.public, key: `products/${sellerId}/${id}.${ext}`, isPublic: true };
      case 'sample':
        return { bucket: config.s3.buckets.public, key: `samples/${sellerId}/${id}.${ext}`, isPublic: true };
      case 'digital_asset':
        return { bucket: config.s3.buckets.quarantine, key: `incoming/${sellerId}/${id}.${ext}`, isPublic: false };
      case 'seller_document':
        return { bucket: config.s3.buckets.privateDocs, key: `kyc/${sellerId}/${id}.${ext}`, isPublic: false };
    }
  }

  /** URL prefirmada para que el navegador suba directo a S3 (sin pasar por la API). */
  async presignUpload(sellerId: string, req: UploadRequest) {
    const t = StorageService.target(req.purpose, sellerId, req.fileName, req.mimeType);
    const uploadUrl = await getSignedUrl(
      this.s3,
      new PutObjectCommand({ Bucket: t.bucket, Key: t.key, ContentType: req.mimeType, ContentLength: req.sizeBytes }),
      { expiresIn: 900 },
    );
    return {
      uploadUrl,
      key: t.key,
      publicUrl: t.isPublic ? `${config.s3.publicBaseUrl}/${t.key}` : null,
      // Para digital_asset: tras subir, un worker escanea y mueve a la bóveda (Fase 1).
      next: req.purpose === 'digital_asset' ? 'scan_pending' : 'ready',
    };
  }

  /**
   * Enlace de descarga de la bóveda, válido pocos minutos y forzado como adjunto.
   * Solo debe llamarse después de validar el entitlement del comprador.
   * En producción se recomienda CloudFront signed URLs con el mismo TTL.
   */
  async signedVaultUrl(storageKey: string, downloadName: string) {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: config.s3.buckets.vault,
        Key: storageKey,
        ResponseContentDisposition: `attachment; filename="${downloadName.replace(/"/g, '')}"`,
      }),
      { expiresIn: config.s3.vaultTtlSeconds },
    );
  }
}
