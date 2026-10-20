import { ConflictException, Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma.service';
import type { AuthUser } from './auth.guard';

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService, @Inject(JwtService) private readonly jwt: JwtService) {}

  async register(email: string, password: string, fullName?: string) {
    const exists = await this.db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) throw new ConflictException('Ese correo ya está registrado');
    const user = await this.db.user.create({
      data: { email: email.toLowerCase(), fullName, passwordHash: await bcrypt.hash(password, 12) },
    });
    return this.issue(user.id, user.email, user.roles);
  }

  async login(email: string, password: string) {
    const user = await this.db.user.findUnique({ where: { email: email.toLowerCase() } });
    const ok = user?.passwordHash && (await bcrypt.compare(password, user.passwordHash));
    if (!user || !ok || user.status !== 'active') throw new UnauthorizedException('Credenciales inválidas');
    return this.issue(user.id, user.email, user.roles);
  }

  /** Re-emite el token, p. ej. después de que el usuario se vuelve vendedor. */
  async refresh(userId: string) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    return this.issue(user.id, user.email, user.roles);
  }

  private async issue(sub: string, email: string, roles: AuthUser['roles']) {
    const payload: AuthUser = { sub, email, roles };
    return { accessToken: await this.jwt.signAsync(payload), user: payload };
  }
}
