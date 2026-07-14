import { Button } from "@/app/components/ui/button";
import { SpaceCard } from "@/app/components/spaces/space-card";
import Link from "next/link";
import { listSpacesWithResources } from "@/app/lib/repository/spaces.repository";

// Renderiza sob demanda (lê o banco a cada request) — não depende do banco no build.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const spaces = await listSpacesWithResources({ onlyActive: true, limitResourcesPerSpace: 6 });

  return (
    <section className="space-y-10 mt-4">
      {/* Hero */}
      <header className="space-y-4">
        <span className="inline-flex items-center rounded-pill bg-emerald-500/10 border border-emerald-500/40 px-3 py-1 text-xs text-emerald-300">
          Piloto • Gestão inteligente de reservas
        </span>

        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold">
            Bem-vindo ao{" "}
            <span className="text-brand-blue">Caju</span>
            <span className="text-brand-orange">Space</span>
          </h1>

          <p className="max-w-2xl text-slate-300">
            Você vê os espaços, escolhe o dia, e o sistema mostra apenas os horários realmente disponíveis.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/espacos">
            <Button>Conhecer espaços</Button>
          </Link>
          <Link href="/reservar">
            <Button variant="secondary">Reservar agora</Button>
          </Link>
        </div>
      </header>

      {/* Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">Conheça os espaços</h2>
            <p className="text-sm text-slate-400">
              Espaços ativos disponíveis para reserva.
            </p>
          </div>

          <Link href="/espacos" className="text-sm text-brand-blue hover:underline">
            Ver todos
          </Link>
        </div>

        {spaces.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum espaço ativo no momento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {spaces.slice(0, 6).map((s) => (
              <SpaceCard
                key={s.id}
                id={s.id}
                name={s.name}
                capacity={s.capacity}
                default_hourly_price={s.default_hourly_price}
                description={s.description}
                image_url={s.image_url}
                resources={s.resources}
              />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}