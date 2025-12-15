import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { getSpaceById, getSpaceResourceIds } from "@/app/lib/repository/spaces.repository";
import { supabaseAdmin } from "@/app/lib/supabase/server-client";

const FALLBACK_IMG = "/public-placeholder.svg";

function money(v: number) {
  return `R$ ${Number(v).toFixed(2)}`;
}

export default async function SpaceDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const space = await getSpaceById(id);
  if (!space) return notFound();
  if (!space.is_active) return notFound();

  const resourceIds = await getSpaceResourceIds(id);

  let resources: Array<{ id: string; name: string }> = [];
  if (resourceIds.length) {
    const { data } = await supabaseAdmin
      .from("resources")
      .select("id, name")
      .in("id", resourceIds)
      .order("name", { ascending: true });

    resources = (data ?? []).map((r) => ({ id: String(r.id), name: String(r.name) }));
  }

  const cover = space.image_url || FALLBACK_IMG;

  return (
    <section className="space-y-6">
      <div>
        <Link href="/espacos" className="text-sm text-brand-blue hover:underline">
          Voltar para espaços
        </Link>
      </div>

      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800">
        <div
          className="h-60 md:h-72 bg-slate-900"
          style={{
            backgroundImage: `url(${cover})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-slate-950/30" />
        <div className="absolute inset-0 bg-linear-to-t from-slate-950/95 via-slate-950/45 to-slate-950/10" />

        <div className="absolute bottom-5 left-5 right-5">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-50">
                {space.name}
              </h1>
              <p className="text-sm text-slate-200/80 mt-2 max-w-2xl">
                {space.description ?? "Sem descrição cadastrada."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success">{space.capacity} pessoas</Badge>
              <Badge variant="outline">{money(space.default_hourly_price)}/hora</Badge>
              <Link href={`/reservar?spaceId=${space.id}`}>
                <Button>Reservar agora</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* GRID INFO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="space-y-1">
          <div className="text-xs text-slate-400">Capacidade</div>
          <div className="text-lg font-semibold">{space.capacity} pessoas</div>
          <div className="text-xs text-slate-500">Ideal para grupos e eventos.</div>
        </Card>

        <Card className="space-y-1">
          <div className="text-xs text-slate-400">Preço base</div>
          <div className="text-lg font-semibold">{money(space.default_hourly_price)}/hora</div>
          <div className="text-xs text-slate-500">Valor estimado varia pela duração.</div>
        </Card>

        <Card className="space-y-1">
          <div className="text-xs text-slate-400">Identificador</div>
          <div className="text-lg font-semibold">{space.slug}</div>
          <div className="text-xs text-slate-500">Usado para referência interna.</div>
        </Card>
      </div>

      {/* RECURSOS */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recursos do espaço</h2>
          <span className="text-xs text-slate-500">
            {resources.length} item(ns)
          </span>
        </div>

        {resources.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum recurso cadastrado.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {resources.map((r) => (
              <Badge key={r.id} variant="outline">
                {r.name}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* CTA final */}
      <Card className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Pronto para reservar?</h3>
          <p className="text-sm text-slate-400">
            Escolha data e duração e confirme em poucos cliques.
          </p>
        </div>

        <Link href={`/reservar?spaceId=${space.id}`}>
          <Button>Reservar este espaço</Button>
        </Link>
      </Card>
    </section>
  );
}
