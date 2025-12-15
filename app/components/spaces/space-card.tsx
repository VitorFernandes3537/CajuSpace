import Link from "next/link";
import clsx from "clsx";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";

export interface SpaceCardProps {
  id: string;
  name: string;
  capacity: number;
  default_hourly_price: number;
  description: string | null;
  image_url: string | null;
  resources?: Array<{ id: string; name: string }>;
}

const FALLBACK_IMG = "/public-placeholder.svg";

function money(v: number) {
  return `R$ ${Number(v).toFixed(2)}`;
}

export function SpaceCard({
  id,
  name,
  capacity,
  default_hourly_price,
  description,
  image_url,
  resources = [],
}: SpaceCardProps) {
  const cover = image_url || FALLBACK_IMG;

  return (
    <Card
      className={clsx(
        "p-0 overflow-hidden",
        "transition-all duration-200",
        "hover:-translate-y-0.5",
        "hover:shadow-card",
        "hover:ring-1 hover:ring-slate-700/70"
      )}
    >
      <div className="h-full flex flex-col">
        {/* Capa */}
        <div className="relative h-40 md:h-44 bg-slate-800">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${cover})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 bg-linear-to-t from-slate-950/95 via-slate-950/50 to-slate-950/10" />

          {/* topo */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
            <Badge variant="success">{capacity} pessoas</Badge>

            <div className="rounded-pill border border-slate-700 bg-slate-950/55 px-3 py-1 text-xs text-slate-100">
              <span className="text-slate-300">Preço/h</span>{" "}
              <span className="font-semibold">{money(default_hourly_price)}</span>
            </div>
          </div>

          {/* texto */}
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-base font-semibold text-slate-50 truncate">
              {name}
            </h3>
            <p className="text-xs text-slate-200/80 line-clamp-2">
              {description ?? "Sem descrição cadastrada."}
            </p>
          </div>
        </div>

        {/* Corpo (flex-1) */}
        <div className="p-4 flex-1 flex flex-col gap-3">
          <div className="min-h-11">
            {resources.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {resources.slice(0, 6).map((r) => (
                  <Badge key={r.id} variant="outline" className="text-[11px]">
                    {r.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Sem recursos cadastrados.</p>
            )}
          </div>

          <div className="mt-auto flex items-center gap-2">
            <Link href={`/espacos/${id}`} className="flex-1">
              <Button variant="ghost" className="w-full">
                Ver detalhes
              </Button>
            </Link>

            <Link href={`/reservar?spaceId=${id}`} className="flex-1">
              <Button className="w-full">Reservar</Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
