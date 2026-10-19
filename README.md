# Marketplace físico + digital — Fase 0 (Cimientos)

Código base del marketplace multi-vendedor descrito en el documento de arquitectura.
Monorepo TypeScript: **Next.js** (web), **NestJS** (API), **PostgreSQL + Prisma**, **Stripe Connect**, almacenamiento S3 separado en público y bóveda privada.

## Regla de dinero

- La plataforma cobra **15 % sobre el precio de los productos**.
- El **envío se cobra aparte y va íntegro al vendedor** (no paga comisión).
- Ejemplo (probado en `packages/shared/src/commission.test.ts`): camiseta $500 + envío $99 (Tienda A) y e-book $200 (Tienda B) → cobro $799; plataforma $105; Tienda A $524; Tienda B $170.

## Estructura

```
apps/
  api/        NestJS — auth y roles, vendedores + Stripe Connect, webhooks idempotentes, subidas prefirmadas
  web/        Next.js — layout mobile-first, insignias Físico/Digital, filtro por tipo
packages/
  db/         Prisma: esquema core (21 modelos), cliente y seed
  shared/     Cálculo de comisión y división del carrito por vendedor, validaciones Zod compartidas
docker-compose.yml   Postgres, Redis, Meilisearch y MinIO (S3 local con 4 buckets)
```

## Arranque local

Requisitos: Node 20+, Docker, [Stripe CLI](https://stripe.com/docs/stripe-cli).

```bash
cp .env.example .env            # pon tus llaves de prueba de Stripe
npm install
npm run infra:up                # Postgres, Redis, Meilisearch, MinIO + buckets
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed

npm run dev -w @mkt/api         # http://localhost:4000/health
npm run dev -w @mkt/web         # http://localhost:3000

# Reenvía los webhooks de Stripe a la API local
stripe listen --forward-to localhost:4000/webhooks/stripe
```

Copia `.env` también dentro de `apps/api` y `packages/db` (o expórtalo en tu shell) para que cada proceso lo lea.

## Endpoints de la Fase 0

| Método | Ruta | Quién | Qué hace |
| --- | --- | --- | --- |
| GET | `/health` | público | Verifica API y base de datos |
| POST | `/auth/register` | público | Crea cuenta de comprador y devuelve JWT |
| POST | `/auth/login` | público | Inicia sesión |
| GET | `/auth/me` | autenticado | Datos del token |
| POST | `/sellers` | autenticado | Crea la tienda, añade rol `seller` y la cuenta Express de Stripe |
| POST | `/sellers/me/onboarding-link` | vendedor | Enlace de Stripe para KYC y cuenta bancaria |
| GET | `/sellers/me` | vendedor | Perfil de la tienda (sin datos fiscales) |
| POST | `/uploads/presign` | vendedor | URL prefirmada: imágenes y muestras → bucket público; archivos de pago → cuarentena |
| POST | `/webhooks/stripe` | Stripe | Verifica firma; `account.updated` habilita pagos; `payment_intent.succeeded` marca el pedido y escribe el ledger |

Tras crear la tienda, vuelve a iniciar sesión para que el token incluya el rol `seller`.

## Almacenamiento

| Bucket | Uso | Acceso |
| --- | --- | --- |
| `mkt-public-media` | Fotos y muestras gratuitas | Lectura pública vía CDN |
| `mkt-quarantine` | Archivos de pago recién subidos | Privado, pendiente de escaneo |
| `mkt-vault` | Archivos de pago aprobados (versionado) | Privado; solo URL firmadas de 10 min |
| `mkt-private-docs` | Documentos fiscales y evidencias | Privado, solo admin |

## Pruebas

```bash
npm test          # comisión, división de carrito, reglas de almacenamiento
npm run typecheck
```

## Siguiente: Fase 1 (MVP)

1. Catálogo: alta de producto con variantes físicas/digitales (`productInputSchema` ya existe) e indexado en Meilisearch.
2. Checkout: usar `splitOrder()` para crear `orders` + `seller_orders`, reservar stock y crear el PaymentIntent con `transfer_group`.
3. Cumplimiento: worker BullMQ que escucha `OrderPaid` → `entitlements` (digital) y `shipments` (físico).
4. Biblioteca: `POST /library/:id/download` que valida el entitlement y usa `StorageService.signedVaultUrl()`.
5. Escáner de cuarentena (ClamAV) que mueve archivos limpios a la bóveda.
6. Transferencias al vendedor con `StripeService.transferToSeller()` al liberar fondos.
