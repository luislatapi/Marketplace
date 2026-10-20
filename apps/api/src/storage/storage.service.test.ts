import { describe, expect, it } from 'vitest';
import { StorageService } from './storage.service';

describe('StorageService.vaultPath', () => {
  it('aísla los archivos por vendedor dentro de vault/', () => {
    expect(StorageService.vaultPath('seller-1', 'curso.ZIP')).toMatch(/^vault\/seller-1\/[0-9a-f-]{36}\.zip$/);
  });

  it('dos subidas del mismo archivo generan rutas distintas', () => {
    expect(StorageService.vaultPath('s', 'a.pdf')).not.toBe(StorageService.vaultPath('s', 'a.pdf'));
  });

  it('limpia extensiones raras', () => {
    expect(StorageService.vaultPath('s', 'archivo.p/d..f')).toMatch(/\.f$/);
    expect(StorageService.vaultPath('s', 'sin-extension')).toMatch(/\.sinexten$/);
  });
});
