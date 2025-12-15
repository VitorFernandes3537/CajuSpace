"use client";

import { useEffect, useState } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import ClientInlineModal, { type ClientInline } from "../components/reservations/clientInlineModal";
import { useToast } from "../components/ui/toast";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

type Space = { id: string; name: string };
type Slot = { start_at: string; end_at: string; estimated_price: number };

type Me =
  | { logged: false }
  | { logged: true; type: "client"; client: { id: string; name?: string } }
  | { logged: true; type: "staff"; staff: { id: string; role: string; name?: string } };

export default function ReservarPageClient() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [spaceId, setSpaceId] = useState("");
  const [date, setDate] = useState("");
  const [durationHours, setDurationHours] = useState(1);
  const router = useRouter();

  const [peopleCount, setPeopleCount] = useState(1);
  const [usagePurpose, setUsagePurpose] = useState("");

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);

  const [me, setMe] = useState<Me>({ logged: false });

  const searchParams = useSearchParams();
  const toast = useToast();

  async function refreshMe() {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const j = await r.json();
      setMe(j?.logged ? j : { logged: false });
    } catch {
      setMe({ logged: false });
    }
  }

  useEffect(() => {
    refreshMe();
  }, []);

  useEffect(() => {
    const incomingSpaceId = searchParams.get("spaceId") ?? "";

    fetch("/api/espacos?onlyActive=true")
      .then((r) => r.json())
      .then((j) => {
        const list = j.spaces ?? [];
        setSpaces(list);

        if (incomingSpaceId && list.some((s: { id: string }) => s.id === incomingSpaceId)) {
          setSpaceId(incomingSpaceId);
        }
      })
      .catch(() => setSpaces([]));
  }, [searchParams]);

  useEffect(() => {
    setSlots([]);
    setError(null);
  }, [spaceId, date, durationHours]);

  function todayYYYYMMDD() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  async function buscarHorarios() {
    setError(null);
    setSlots([]);
    setLoading(true);

    try {
      const durationMinutes = durationHours * 60;

      const qs = new URLSearchParams({
        space_id: spaceId,
        date,
        duration: String(durationMinutes),
      });

      const res = await fetch(`/api/availability?${qs.toString()}`);
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Erro ao buscar horários.");
      setSlots(json.espacos ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function validateReservaBasics() {
    if (!usagePurpose.trim()) {
      toast.error("Informe a finalidade.");
      return false;
    }
    if (!Number.isFinite(Number(peopleCount)) || Number(peopleCount) <= 0) {
      toast.error("Informe a quantidade de pessoas.");
      return false;
    }
    return true;
  }

  async function reservarDireto(slot: Slot) {
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        space_id: spaceId,
        start_at: slot.start_at,
        end_at: slot.end_at,
        people_count: peopleCount,
        usage_purpose: usagePurpose.trim(),
        source: "web",
      }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Erro ao criar reserva.");
    return json;
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Reservar espaço</h1>
        <p className="text-sm text-slate-400">Escolha o espaço, data e duração para ver horários disponíveis.</p>
      </header>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <label className="text-sm text-slate-400">Espaço</label>
            <select
              className="w-full border rounded px-2 py-2 bg-slate-950 text-slate-100 border-slate-700"
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
            >
              <option value="">Selecione</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-400">Data</label>
            <Input type="date" min={todayYYYYMMDD()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div>
            <label className="text-sm text-slate-400">Duração (H)</label>
            <select
              className="w-full border rounded px-2 py-2 bg-slate-950 text-slate-100 border-slate-700"
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
            >
              <option value={1}>1 hora</option>
              <option value={2}>2 horas</option>
              <option value={3}>3 horas</option>
              <option value={4}>4 horas</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-400">Qtd. pessoas *</label>
            <Input type="number" min={1} value={peopleCount} onChange={(e) => setPeopleCount(Number(e.target.value))} />
          </div>

          <div>
            <label className="text-sm text-slate-400">Finalidade *</label>
            <Input
              placeholder="Reunião, workshop..."
              value={usagePurpose}
              onChange={(e) => setUsagePurpose(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={buscarHorarios} disabled={!spaceId || !date || loading}>
            {loading ? "Buscando..." : "Buscar horários"}
          </Button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {slots.map((slot, idx) => (
          <Card key={idx} className="p-4 space-y-2">
            <div className="text-sm text-slate-400">Horário</div>
            <div className="text-base font-semibold">
              {new Date(slot.start_at).toLocaleTimeString("pt-BR", {
                timeZone: "America/Sao_Paulo",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              -{" "}
              {new Date(slot.end_at).toLocaleTimeString("pt-BR", {
                timeZone: "America/Sao_Paulo",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>

            <div className="text-sm text-slate-400">R$ {slot.estimated_price.toFixed(2)}</div>

            <Button
              className="w-full"
              variant="ghost"
              onClick={async () => {
                if (!validateReservaBasics()) return;

                setSelectedSlot(slot);

                if (me.logged && me.type === "client") {
                  try {
                    await reservarDireto(slot);
                    router.push("/minhas-reservas?from=reserve");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Erro inesperado.");
                  }
                  return;
                }

                if (me.logged && me.type === "staff") {
                  toast.info("Selecione/cadastre o cliente para concluir a reserva.");
                }

                setClientModalOpen(true);
              }}
            >
              Reservar
            </Button>
          </Card>
        ))}
      </div>

      {!loading && slots.length === 0 && spaceId && date && (
        <p className="text-sm text-slate-400">Nenhum horário disponível para os filtros selecionados.</p>
      )}

      <ClientInlineModal
        open={clientModalOpen}
        noSession={me.logged && me.type === "staff"}
        onClose={() => setClientModalOpen(false)}
        onConfirm={async (client: ClientInline) => {
          if (!selectedSlot) throw new Error("Slot inválido.");

          const wasStaff = me.logged && me.type === "staff";

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const payload: any = {
            space_id: spaceId,
            start_at: selectedSlot.start_at,
            end_at: selectedSlot.end_at,
            people_count: peopleCount,
            usage_purpose: usagePurpose.trim(),
            source: wasStaff ? "operator" : "web",
          };

          if (client?.id) {
            payload.client_id = client.id;
          } else {
            payload.client = client;
          }

          const res = await fetch("/api/reservations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Erro ao criar reserva.");

          setClientModalOpen(false);
          setSlots([]);
          setSelectedSlot(null);

          if (wasStaff) {
            toast.success(`Reserva criada para ${client.name}.`);
            return;
          }

          await refreshMe();
          router.push("/minhas-reservas?from=reserve");
        }}
      />
    </section>
  );
}
