import { SpaceCard } from "@/app/components/spaces/space-card";
import { listSpacesWithResources } from "@/app/lib/repository/spaces.repository";

export default async function EspacosPage() {
  const spaces = await listSpacesWithResources({ onlyActive: true, limitResourcesPerSpace: 6 });

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Espaços</h1>
        <p className="text-sm text-slate-400">
          Veja os espaços ativos e escolha o melhor para sua reserva.
        </p>
      </header>

      {spaces.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum espaço ativo no momento.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {spaces.map((s) => (
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
  );
}