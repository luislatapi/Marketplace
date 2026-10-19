import { BadRequestException, Body, Controller, ForbiddenException, Post, UseGuards } from '@nestjs/common';
import { uploadRequestSchema, type UploadRequest } from '@mkt/shared';
import { AuthGuard, CurrentUser, Roles, type AuthUser } from '../auth/auth.guard';
import { PrismaService } from '../common/prisma.service';
import { ZodPipe } from '../common/zod.pipe';
import { StorageService } from './storage.service';

@Controller('uploads')
@UseGuards(AuthGuard)
export class UploadsController {
  constructor(private readonly storage: StorageService, private readonly db: PrismaService) {}

  @Post('presign')
  @Roles('seller')
  async presign(@CurrentUser() user: AuthUser, @Body(new ZodPipe(uploadRequestSchema)) body: UploadRequest) {
    const seller = await this.db.seller.findUnique({ where: { userId: user.sub } });
    if (!seller || seller.status === 'suspended') throw new ForbiddenException('Tienda no habilitada');
    try {
      return await this.storage.presignUpload(seller.id, body);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }
}
