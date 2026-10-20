import { BadRequestException, Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, UseGuards, Inject } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard, CurrentUser, Roles, type AuthUser } from '../auth/auth.guard';
import { CurrentSeller } from '../common/current-seller';
import { PrismaService } from '../common/prisma.service';
import { ZodPipe } from '../common/zod.pipe';
import { DIGITAL_ALLOWED_TYPES, StorageService } from '../storage/storage.service';

const pathSchema = z.object({ fileName: z.string().min(1).max(255) });
const assetSchema = z.object({ title: z.string().min(2).max(160) });
const versionSchema = z.object({
  pathname: z.string().min(10).max(500),
  versionLabel: z.string().min(1).max(20),
  fileName: z.string().min(1).max(255),
  changelog: z.string().max(2000).optional(),
});

/**
 * Archivos digitales del vendedor. Flujo:
 * 1. POST /seller/assets            → crea el contenedor (p. ej. "Guía en PDF")
 * 2. POST /seller/assets/path       → ruta privada donde subir
 * 3. upload() del navegador a /uploads/vault con esa ruta
 * 4. POST /seller/assets/:id/versions → registra la versión; la anterior deja de ser la actual
 */
@Controller('seller/assets')
@UseGuards(AuthGuard)
@Roles('seller')
export class AssetsController {
  constructor(@Inject(PrismaService) private readonly db: PrismaService, @Inject(StorageService) private readonly storage: StorageService, @Inject(CurrentSeller) private readonly current: CurrentSeller) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const sellerId = await this.current.id(user);
    return this.db.digitalAsset.findMany({
      where: { sellerId },
      include: { versions: { orderBy: { createdAt: 'desc' }, select: { id: true, versionLabel: true, fileName: true, sizeBytes: true, scanStatus: true, isCurrent: true, createdAt: true } } },
    });
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(assetSchema)) body: z.infer<typeof assetSchema>) {
    return this.db.digitalAsset.create({ data: { sellerId: await this.current.id(user), title: body.title } });
  }

  @Post('path')
  async path(@CurrentUser() user: AuthUser, @Body(new ZodPipe(pathSchema)) body: z.infer<typeof pathSchema>) {
    return { pathname: StorageService.vaultPath(await this.current.id(user), body.fileName), handleUploadUrl: '/uploads/vault', access: 'private' };
  }

  @Post(':id/versions')
  async addVersion(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) assetId: string,
    @Body(new ZodPipe(versionSchema)) body: z.infer<typeof versionSchema>,
  ) {
    const sellerId = await this.current.id(user);
    const asset = await this.db.digitalAsset.findFirst({ where: { id: assetId, sellerId } });
    if (!asset) throw new NotFoundException('Archivo no encontrado');

    let meta;
    try {
      meta = await this.storage.inspectUpload(sellerId, body.pathname);
    } catch (e) {
      throw new BadRequestException(`No se encontró la subida: ${(e as Error).message}`);
    }
    // Revisión mínima en serverless: tipo y tamaño. Un escáner antivirus se agrega en la Fase 2.
    const typeOk = DIGITAL_ALLOWED_TYPES.includes(meta.contentType);
    const scanStatus = typeOk ? 'clean' : 'flagged';

    return this.db.$transaction(async (tx) => {
      if (typeOk) await tx.digitalAssetVersion.updateMany({ where: { assetId, isCurrent: true }, data: { isCurrent: false } });
      return tx.digitalAssetVersion.create({
        data: {
          assetId,
          versionLabel: body.versionLabel,
          storageKey: body.pathname,
          fileName: body.fileName,
          mimeType: meta.contentType,
          sizeBytes: BigInt(meta.size),
          scanStatus,
          isCurrent: typeOk,
          changelog: body.changelog,
        },
        select: { id: true, versionLabel: true, scanStatus: true, isCurrent: true, sizeBytes: true },
      });
    });
  }
}
