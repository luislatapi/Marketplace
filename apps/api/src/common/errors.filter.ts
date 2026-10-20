import { ArgumentsHost, Catch, HttpException, HttpStatus, Logger, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';

/**
 * Traduce fallas de infraestructura a respuestas claras en lugar de un 500 genérico:
 * - base de datos sin configurar o inalcanzable → 503
 * - violación de unicidad de Prisma → 409
 */
@Catch()
export class ErrorsFilter implements ExceptionFilter {
  private readonly log = new Logger('Errors');

  catch(err: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (err instanceof HttpException) {
      res.status(err.getStatus()).json(err.getResponse());
      return;
    }

    const e = err as { name?: string; code?: string; message?: string };
    const prismaError = typeof e?.name === 'string' && e.name.startsWith('PrismaClient');
    if (
      e?.name === 'PrismaClientInitializationError' ||
      ['P1000', 'P1001', 'P1002', 'P1017'].includes(e?.code ?? '') ||
      (prismaError && !process.env.DATABASE_URL)
    ) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        statusCode: 503,
        message: process.env.DATABASE_URL ? 'La base de datos no responde; intenta de nuevo en un momento' : 'La base de datos aún no está configurada',
      });
      return;
    }
    if (e?.code === 'P2002') {
      res.status(HttpStatus.CONFLICT).json({ statusCode: 409, message: 'Ese registro ya existe' });
      return;
    }
    if (e?.code === 'P2021' || e?.code === 'P2022') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({ statusCode: 503, message: 'El esquema de la base de datos no está sincronizado; vuelve a publicar la API' });
      return;
    }

    this.log.error(e?.message ?? String(err), (err as Error)?.stack);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ statusCode: 500, message: 'Error interno' });
  }
}
