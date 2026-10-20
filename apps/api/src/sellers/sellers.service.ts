import { ConflictException, Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { StripeService } from '../payments/stripe.service';
import { config } from '../config';

function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

@Injectable()
export class SellersService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService, @Inject(StripeService) private readonly stripe: StripeService) {}

  /** Convierte a un usuario en vendedor: perfil, rol y cuenta Express de Stripe. */
  async becomeSeller(userId: string, input: { storeName: string; businessType?: string; taxId?: string; taxRegime?: string }) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId }, include: { seller: true } });
    if (user.seller) throw new ConflictException('Ya tienes una tienda');

    const base = slugify(input.storeName) || 'tienda';
    const taken = await this.db.seller.count({ where: { slug: { startsWith: base } } });
    const slug = taken ? `${base}-${taken + 1}` : base;

    // Sin Stripe (modo demo) la tienda se crea igual; la cuenta Express se abre al pedir el alta.
    const account = config.stripe.enabled ? await this.stripe.createExpressAccount(user.email) : null;

    return this.db.$transaction(async (tx) => {
      if (!user.roles.includes('seller')) {
        await tx.user.update({ where: { id: userId }, data: { roles: { push: 'seller' } } });
      }
      return tx.seller.create({
        data: {
          userId,
          storeName: input.storeName,
          slug,
          businessType: input.businessType,
          taxId: input.taxId, // Fase 2: cifrado de columna
          taxRegime: input.taxRegime,
          stripeAccountId: account?.id,
          status: account ? 'pending_kyc' : 'active',
          commissionBps: config.commissionBps,
        },
      });
    });
  }

  async onboardingLink(userId: string) {
    let seller = await this.db.seller.findUnique({ where: { userId }, include: { user: { select: { email: true } } } });
    if (!seller) throw new NotFoundException('Primero crea tu tienda');
    if (!seller.stripeAccountId) {
      const account = await this.stripe.createExpressAccount(seller.user.email);
      seller = await this.db.seller.update({ where: { id: seller.id }, data: { stripeAccountId: account.id }, include: { user: { select: { email: true } } } });
    }
    const link = await this.stripe.createOnboardingLink(
      seller.stripeAccountId!,
      `${config.webUrl}/vendedor?onboarding=ok`,
      `${config.webUrl}/vendedor?onboarding=retry`,
    );
    return { url: link.url, expiresAt: new Date(link.expires_at * 1000) };
  }

  async me(userId: string) {
    const seller = await this.db.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('No tienes tienda');
    const { taxId: _hidden, ...safe } = seller;
    return { ...safe, commissionPercent: seller.commissionBps / 100 };
  }
}
