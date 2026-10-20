import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.guard';
import { PrismaService } from './prisma.service';

/** Resuelve la tienda del usuario autenticado y bloquea tiendas suspendidas. */
@Injectable()
export class CurrentSeller {
  constructor(private readonly db: PrismaService) {}

  async get(user: AuthUser) {
    const seller = await this.db.seller.findUnique({ where: { userId: user.sub } });
    if (!seller) throw new ForbiddenException('Primero crea tu tienda');
    if (seller.status === 'suspended') throw new ForbiddenException('Tu tienda está suspendida');
    return seller;
  }

  async id(user: AuthUser) {
    return (await this.get(user)).id;
  }
}
