import { describe, expect, it } from 'vitest';
import { downloadBlocker } from './library.service';
import { licenseKey, orderStatusFromItems } from '../fulfillment/fulfillment.service';

const base = { status: 'active', expiresAt: null, downloadsUsed: 0, maxDownloads: 5 };

describe('downloadBlocker', () => {
  it('permite descargar un acceso activo dentro del límite', () => {
    expect(downloadBlocker(base)).toBeNull();
  });
  it('bloquea al llegar al límite', () => {
    expect(downloadBlocker({ ...base, downloadsUsed: 5 })).toMatch(/límite/);
  });
  it('descargas ilimitadas cuando maxDownloads es null', () => {
    expect(downloadBlocker({ ...base, maxDownloads: null, downloadsUsed: 999 })).toBeNull();
  });
  it('bloquea accesos vencidos, suspendidos o revocados', () => {
    expect(downloadBlocker({ ...base, expiresAt: new Date(Date.now() - 1000) })).toMatch(/venció/);
    expect(downloadBlocker({ ...base, status: 'suspended' })).toMatch(/disputa/);
    expect(downloadBlocker({ ...base, status: 'revoked' })).toMatch(/revocado/);
  });
});

describe('orderStatusFromItems', () => {
  it('carrito mixto: digital entregado y físico pendiente → parcial', () => {
    expect(orderStatusFromItems(['delivered', 'ready_to_ship'])).toBe('partially_fulfilled');
  });
  it('todo entregado → completo', () => {
    expect(orderStatusFromItems(['delivered', 'delivered'])).toBe('fulfilled');
  });
  it('solo físicos sin enviar → pagado', () => {
    expect(orderStatusFromItems(['ready_to_ship'])).toBe('paid');
  });
});

describe('licenseKey', () => {
  it('genera claves con formato XXXXX-XXXXX-XXXXX-XXXXX y únicas', () => {
    const a = licenseKey();
    expect(a).toMatch(/^[0-9A-F]{5}(-[0-9A-F]{5}){3}$/);
    expect(licenseKey()).not.toBe(a);
  });
});
