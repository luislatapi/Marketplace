import { describe, expect, it } from 'vitest';
import { StorageService } from './storage.service';

describe('StorageService.target', () => {
  it('las imágenes van al bucket público', () => {
    const t = StorageService.target('product_image', 'seller-1', 'foto.JPG', 'image/jpeg');
    expect(t.isPublic).toBe(true);
    expect(t.bucket).toBe('mkt-public-media');
    expect(t.key).toMatch(/^products\/seller-1\/[0-9a-f-]{36}\.jpg$/);
  });

  it('los archivos de pago nunca van al bucket público: entran a cuarentena', () => {
    const t = StorageService.target('digital_asset', 'seller-1', 'curso.zip', 'application/zip');
    expect(t.isPublic).toBe(false);
    expect(t.bucket).toBe('mkt-quarantine');
  });

  it('rechaza imágenes con un tipo no permitido', () => {
    expect(() => StorageService.target('product_image', 's', 'x.svg', 'image/svg+xml')).toThrow();
  });

  it('dos subidas del mismo archivo generan claves distintas', () => {
    const a = StorageService.target('sample', 's', 'a.pdf', 'application/pdf');
    const b = StorageService.target('sample', 's', 'a.pdf', 'application/pdf');
    expect(a.key).not.toBe(b.key);
  });
});
