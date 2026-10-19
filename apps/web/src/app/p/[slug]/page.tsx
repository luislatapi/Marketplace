import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProduct, PRODUCTS } from '@/lib/catalog';
import { ProductView } from './ProductView';

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  return { title: p?.title ?? 'Producto', description: p?.description };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  return <ProductView slug={product.slug} />;
}
