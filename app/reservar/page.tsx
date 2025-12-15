import { Suspense } from "react";
import ReservarPageClient from "./reservar-client";

export const dynamic = "force-dynamic"; 
export const revalidate = 0; 

export default function ReservarPage() {
  return (
    <Suspense
      fallback={
        <section className="space-y-6">
          <header>
            <h1 className="text-2xl font-semibold">Reservar espaço</h1>
            <p className="text-sm text-slate-400">Carregando...</p>
          </header>
        </section>
      }
    >
      <ReservarPageClient />
    </Suspense>
  );
}
