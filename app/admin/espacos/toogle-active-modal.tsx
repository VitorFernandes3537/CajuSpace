"use client";

import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";

export default function ToggleActiveModal({
  open,
  spaceName,
  nextStateActive,
  onConfirm,
  onClose,
  loading,
}: {
  open: boolean;
  spaceName: string;
  nextStateActive: boolean;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-md p-5">
        <h3 className="text-lg font-semibold">Confirmar alteração</h3>
        <p className="text-sm text-slate-300 mt-2">
          Você quer {nextStateActive ? "ativar" : "desativar"} o espaço{" "}
          <span className="font-semibold text-slate-100">{spaceName}</span>?
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? "Salvando..." : "Confirmar"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
