import Link from "next/link";
import { listSpaces } from "@/app/lib/repository/spaces.repository";
import { Button } from "@/app/components/ui/button";
import SpacesListClient from "@/app/admin/espacos/space-list-client";

export default async function AdminSpacesPage() {
  const spaces = await listSpaces();

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Espaços</h1>
          <p className="text-sm text-slate-400">
            Gerencie os espaços disponíveis para reserva.
          </p>
        </div>
        <Link href="/admin/espacos/novo">
          <Button>Cadastrar espaço</Button>
        </Link>
      </header>

      {spaces.length === 0 ? (
        <p className="text-sm text-slate-400">
          Nenhum espaço cadastrado ainda. Clique em &quot;Cadastrar espaço&quot;.
        </p>
      ) : (
        <SpacesListClient spaces={spaces} />
      )}
    </section>
  );
}
