import { Browse } from '@/components/Browse';

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 pt-5">
      <h1 className="font-display text-2xl leading-tight sm:text-3xl">
        Hecho por vendedores independientes.
        <br />
        <span className="text-ink/60">Llega a tu puerta o a tu correo.</span>
      </h1>
      <div className="mt-5">
        <Browse />
      </div>
    </main>
  );
}
