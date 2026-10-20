import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard, CurrentUser, Roles, type AuthUser } from '../auth/auth.guard';
import { ZodPipe } from '../common/zod.pipe';
import { SellersService } from './sellers.service';

interface BecomeSellerBody {
  storeName: string;
  businessType?: 'persona_fisica' | 'persona_moral';
  taxId?: string;
  taxRegime?: string;
}

const becomeSellerSchema = z.object({
  storeName: z.string().min(2).max(80),
  businessType: z.enum(['persona_fisica', 'persona_moral']).optional(),
  taxId: z.string().max(20).optional(),
  taxRegime: z.string().max(80).optional(),
}) as unknown as z.ZodType<BecomeSellerBody>;

@Controller('sellers')
@UseGuards(AuthGuard)
export class SellersController {
  constructor(private readonly sellers: SellersService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(becomeSellerSchema)) body: BecomeSellerBody) {
    return this.sellers.becomeSeller(user.sub, body);
  }

  @Post('me/onboarding-link')
  @Roles('seller')
  onboarding(@CurrentUser() user: AuthUser) {
    return this.sellers.onboardingLink(user.sub);
  }

  @Get('me')
  @Roles('seller')
  me(@CurrentUser() user: AuthUser) {
    return this.sellers.me(user.sub);
  }
}
