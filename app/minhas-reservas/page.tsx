// app/minhas-reservas/page.tsx
import { Suspense } from "react";
import MinhasReservasClient from "./minhas-reservas-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense
      fallback={
        <section className="cj-container py-10">
          <h1 className="text-2xl font-semibold">Minhas reservas</h1>
          <p className="text-sm text-slate-400 mt-2">Carregando...</p>
        </section>
      }
    >
      <MinhasReservasClient />
    </Suspense>
  );
}
