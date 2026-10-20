import { Injectable, Logger } from '@nestjs/common';
import { config } from '../config';

/**
 * Correos transaccionales. En esta fase se registran en los logs de Vercel;
 * para enviarlos de verdad se agrega RESEND_API_KEY (Fase 2) sin tocar a quien llama.
 */
@Injectable()
export class NotificationsService {
  private readonly log = new Logger(NotificationsService.name);

  private async send(to: string, subject: string, lines: string[]) {
    this.log.log(`[correo] para=${to} asunto="${subject}" · ${lines.join(' | ')}`);
  }

  buyerReceipt(to: string, orderNumber: string, totalCents: number, currency: string) {
    const total = new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(totalCents / 100);
    return this.send(to, `Recibo de tu pedido ${orderNumber}`, [`Total pagado: ${total}`, `${config.webUrl}/cuenta`]);
  }

  /** Nunca incluye enlaces al archivo: solo a la biblioteca, que exige sesión. */
  buyerDigitalReady(to: string, orderNumber: string, titles: string[]) {
    return this.send(to, 'Tus productos digitales ya están listos', [...titles, `${config.webUrl}/cuenta?tab=biblioteca`, `Pedido ${orderNumber}`]);
  }

  sellerNewShipment(to: string, storeName: string, orderNumber: string, items: string[]) {
    return this.send(to, `${storeName}: tienes un envío por preparar (${orderNumber})`, [...items, `${config.webUrl}/vendedor`]);
  }

  buyerShipped(to: string, orderNumber: string, carrier: string, tracking: string) {
    return this.send(to, `Tu pedido ${orderNumber} va en camino`, [`${carrier} · guía ${tracking}`]);
  }
}
