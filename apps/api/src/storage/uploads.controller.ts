import { BadRequestException, Body, Controller, HttpCode, Post, Req, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import type { Request } from 'express';
import type { AuthUser } from '../auth/auth.guard';
import { PrismaService } from '../common/prisma.service';
import { DIGITAL_ALLOWED_TYPES, MAX_DIGITAL_BYTES } from './storage.service';

/**
 * Subida directa navegador → Vercel Blob privado.
 * El navegador usa `upload(..., { access: 'private', handleUploadUrl: '/uploads/vault', headers: { Authorization } })`.
 * Vercel Blob también llama a esta ruta al terminar (sin JWT), por eso no lleva AuthGuard global.
 */
@Controller('uploads')
export class UploadsController {
  constructor(@Inject(PrismaService) private readonly db: PrismaService, @Inject(JwtService) private readonly jwt: JwtService) {}

  @Post('vault')
  @HttpCode(200)
  async vault(@Req() req: Request, @Body() body: HandleUploadBody) {
    try {
      return await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async (pathname) => {
          const sellerId = await this.sellerFromRequest(req);
          if (!pathname.startsWith(`vault/${sellerId}/`)) {
            throw new Error('Ruta inválida: usa la ruta devuelta por POST /seller/assets/path');
          }
          return {
            allowedContentTypes: DIGITAL_ALLOWED_TYPES,
            maximumSizeInBytes: MAX_DIGITAL_BYTES,
            addRandomSuffix: false,
            allowOverwrite: false,
            tokenPayload: JSON.stringify({ sellerId }),
          };
        },
        // El registro de la versión lo hace el vendedor con POST /seller/assets/:id/versions.
        onUploadCompleted: async () => undefined,
      });
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  private async sellerFromRequest(req: Request) {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new Error('No autenticado');
    const user = await this.jwt.verifyAsync<AuthUser>(token);
    const seller = await this.db.seller.findUnique({ where: { userId: user.sub } });
    if (!seller || seller.status === 'suspended') throw new Error('Tienda no habilitada');
    return seller.id;
  }
}

