import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { ZodPipe } from '../common/zod.pipe';
import { AuthGuard, CurrentUser, type AuthUser } from './auth.guard';
import { AuthService } from './auth.service';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10, 'Mínimo 10 caracteres'),
  fullName: z.string().max(120).optional(),
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body(new ZodPipe(registerSchema)) body: z.infer<typeof registerSchema>) {
    return this.auth.register(body.email, body.password, body.fullName);
  }

  @Post('login')
  login(@Body(new ZodPipe(loginSchema)) body: z.infer<typeof loginSchema>) {
    return this.auth.login(body.email, body.password);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  /** Re-emite el token con los roles actuales (p. ej. después de crear la tienda). */
  @Post('refresh')
  @UseGuards(AuthGuard)
  refresh(@CurrentUser() user: AuthUser) {
    return this.auth.refresh(user.sub);
  }
}
