"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import EditSpaceModal from "./edit-space-modal";
import ToggleActiveModal from "./toogle-active-modal";
import { useToast } from "@/app/components/ui/toast";

type Space = {
  id: string;
  name: string;
  slug: string;
  capacity: number;
  description: string | null;
  default_hourly_price: number;
  space_type_id: string | null;
  image_url: string | null;
  is_active: boolean;
};

export default function SpacesListClient({ spaces }: { spaces: Space[] }) {
  const router = useRouter();
  const toast = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);

  const [toggleId, setToggleId] = useState<string | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  const editingSpace = useMemo(
    () => spaces.find((s) => s.id === editingId) || null,
    [spaces, editingId]
  );

  const togglingSpace = useMemo(
    () => spaces.find((s) => s.id === toggleId) || null,
    [spaces, toggleId]
  );

  async function confirmToggle() {
    if (!togglingSpace) return;

    setToggleLoading(true);
    try {
      const res = await fetch(`/api/espacos/${togglingSpace.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !togglingSpace.is_active }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Falha ao atualizar status.");

      toast.success(
        `Espaço ${!togglingSpace.is_active ? "ativado" : "desativado"} com sucesso.`
      );

      setToggleId(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar status.");
    } finally {
      setToggleLoading(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {spaces.map((s) => (
          <Card key={s.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">{s.name}</h2>
                <p className="text-xs text-slate-400">Capacidade: {s.capacity} pessoas</p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className="text-xs text-slate-400">
                  R$ {Number(s.default_hourly_price).toFixed(2)}/hora
                </span>

                <Badge variant={s.is_active ? "success" : "outline"}>
                  {s.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </div>

            {s.description && (
              <p className="text-sm text-slate-300 line-clamp-2">{s.description}</p>
            )}

            <div className="mt-2 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                className="text-xs px-3 py-1"
                onClick={() => setToggleId(s.id)}
              >
                {s.is_active ? "Desativar" : "Ativar"}
              </Button>

              <Button
                variant="secondary"
                className="text-xs px-3 py-1"
                onClick={() => setEditingId(s.id)}
              >
                Editar
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {editingSpace && (
        <EditSpaceModal
          open={!!editingId}
          space={editingSpace}
          onClose={() => setEditingId(null)}
          onSaved={() => router.refresh()}
        />
      )}

      <ToggleActiveModal
        open={!!toggleId}
        spaceName={togglingSpace?.name ?? ""}
        nextStateActive={togglingSpace ? !togglingSpace.is_active : true}
        loading={toggleLoading}
        onClose={() => setToggleId(null)}
        onConfirm={confirmToggle}
      />
    </>
  );
}
