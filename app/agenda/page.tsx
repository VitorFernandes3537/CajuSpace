"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { useToast } from "@/app/components/ui/toast";

type Space = { id: string; name: string };

type Reservation = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  total_price: number | null;
  space_id: string;
  cancel_reason?: string | null;
  cancelled_at?: string | null;
  spaces: { id: string; name: string } | null;
  clients: { id: string; name: string | null; email: string | null; phone: string | null } | null;
};

type Me =
  | { logged: false }
  | { logged: true; type: "client"; client: { id: string; name?: string } }
  | { logged: true; type: "staff"; staff: { id: string; role: string; name?: string } };

function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

function statusLabel(s: string) {
  if (s === "pending") return "pendente";
  if (s === "confirmed") return "confirmada";
  if (s === "completed") return "concluída";
  if (s === "cancelled") return "cancelada";
  if (s === "no_show") return "no-show";
  return s;
}

function statusBadgeClass(s: string) {
  if (s === "confirmed") return "bg-emerald-500/15! text-emerald-300! border border-emerald-500/25!";
  if (s === "pending") return "bg-amber-500/15! text-amber-300! border border-amber-500/25!";
  if (s === "completed") return "bg-sky-500/15! text-sky-300! border border-sky-500/25!";
  if (s === "cancelled" || s === "no_show") return "bg-rose-500/15! text-rose-300! border border-rose-500/25!";
  return "bg-slate-500/15! text-slate-300! border border-slate-500/25!";
}

type StaffAction = "confirmed" | "completed" | "cancelled" | "no_show";

export default function AgendaPage() {
  const toast = useToast();

  const [me, setMe] = useState<Me>({ logged: false });

  const [date, setDate] = useState(todayYYYYMMDD());
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [spaceId, setSpaceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  // modal staff
  const [actionOpen, setActionOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState("Cliente não pagou a tempo");
  const [actionStatus, setActionStatus] = useState<StaffAction>("cancelled");
  const [actionReservation, setActionReservation] = useState<Reservation | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: Me) => setMe(j?.logged ? j : { logged: false }))
      .catch(() => setMe({ logged: false }));
  }, []);

  useEffect(() => {
    fetch("/api/espacos?onlyActive=true")
      .then((r) => r.json())
      .then((j: { spaces?: Space[] }) => setSpaces(j.spaces ?? []))
      .catch(() => setSpaces([]));
  }, []);

  async function loadAgenda() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ date });
      if (spaceId) qs.set("spaceId", spaceId);

      const res = await fetch(`/api/agenda?${qs.toString()}`, { cache: "no-store" });
      const raw = await res.text();

      let json: { reservations?: Reservation[]; error?: string } = {};
      try {
        json = raw ? (JSON.parse(raw) as { reservations?: Reservation[]; error?: string }) : {};
      } catch {
        throw new Error("Servidor não retornou JSON (provável rota errada).");
      }

      if (!res.ok) throw new Error(json.error || "Erro ao buscar agenda.");

      const list = json.reservations ?? [];
      setReservations(list);

      if (list.length === 0) toast.info("Sem reservas para esse dia.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAgenda();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, spaceId]);

  const grouped = useMemo(() => {
    const map = new Map<string, Reservation[]>();

    for (const r of reservations) {
      const key = r.spaces?.name || "Sem espaço";
      map.set(key, [...(map.get(key) ?? []), r]);
    }

    const entries = Array.from(map.entries());

    for (const [, list] of entries) {
      list.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
    }

    entries.sort((a, b) => a[0].localeCompare(b[0]));
    return entries;
  }, [reservations]);

  const isStaff = me.logged && me.type === "staff";

  function openActionModal(r: Reservation, status: StaffAction) {
    setActionReservation(r);
    setActionStatus(status);
    setActionError(null);

    if (status === "cancelled") setActionReason("Cliente não pagou a tempo");
    if (status === "no_show") setActionReason("Cliente não compareceu");
    if (status === "confirmed") setActionReason("");
    if (status === "completed") setActionReason("");

    setActionOpen(true);
  }

  async function submitAction() {
    if (!actionReservation) return;

    const reservation_id = actionReservation.id;
    const status = actionStatus;
    const reason = actionReason.trim();

    if ((status === "cancelled" || status === "no_show") && !reason) {
      setActionError("Informe o motivo.");
      return;
    }

    setActionError(null);
    setActing(true);

    try {
      const res = await fetch("/api/reservations/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservation_id, status, reason }),
      });

      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json?.ok) throw new Error(json.error || "Falha ao atualizar status.");

      toast.success("Reserva atualizada.");
      setActionOpen(false);
      setActionReservation(null);

      await loadAgenda();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Falha ao atualizar.");
    } finally {
      setActing(false);
    }
  }

  return (
    <section className="space-y-6 cj-container py-10">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Agenda</h1>
          <p className="text-sm text-slate-400">Operação do dia: reservas por horário e por espaço.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="min-w-[180px]">
            <label className="text-xs text-slate-400">Data</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="min-w-[220px]">
            <label className="text-xs text-slate-400">Espaço (opcional)</label>
            <select
              className="w-full mt-1 rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
            >
              <option value="">Todos</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={loadAgenda} disabled={loading} className="self-end">
            {loading ? "Atualizando..." : "Atualizar"}
          </Button>
        </div>
      </header>

      {grouped.length === 0 ? (
        <Card className="p-4">
          <p className="text-sm text-slate-400">Nenhuma reserva encontrada.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([spaceName, list]) => (
            <Card key={spaceName} className="p-5 bg-slate-900/30 border border-slate-800/70 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h2 className="text-lg font-semibold">{spaceName}</h2>
                  <p className="text-xs text-slate-500">Reservas do dia para este espaço.</p>
                </div>

                <Badge className="bg-slate-500/15! text-slate-200! border border-slate-500/25!">
                  {list.length} reserva(s)
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {list.map((r) => {
                  const st = String(r.status);

                  return (
                    <div key={r.id} className="rounded-2xl border border-slate-800/70 bg-slate-950/30 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-slate-100">
                            {fmtTime(r.start_at)} — {fmtTime(r.end_at)}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            ID: <span className="text-slate-400">{r.id.slice(0, 8)}</span>
                          </div>
                        </div>

                        <Badge className={statusBadgeClass(st)}>{statusLabel(st)}</Badge>
                      </div>

                      <div className="mt-3 space-y-1">
                        <div className="text-sm text-slate-300">
                          Cliente: <span className="text-slate-100 font-semibold">{r.clients?.name || "Sem nome"}</span>
                        </div>

                        {(r.clients?.email || r.clients?.phone) && (
                          <div className="text-xs text-slate-400">
                            {r.clients?.email ? `Email: ${r.clients.email}` : ""}
                            {r.clients?.email && r.clients?.phone ? " • " : ""}
                            {r.clients?.phone ? `Tel: ${r.clients.phone}` : ""}
                          </div>
                        )}

                        {(st === "cancelled" || st === "no_show") && r.cancel_reason && (
                          <div className="text-xs text-slate-400">
                            Motivo: <span className="text-slate-200">{r.cancel_reason}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-sm">
                          {r.total_price != null ? (
                            <span className="text-slate-300">
                              Total: <span className="text-slate-100 font-semibold">{brl(Number(r.total_price))}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500">Total não informado</span>
                          )}
                        </div>

                        <Link href={`/espacos/${r.space_id}`} className="text-xs text-brand-blue hover:underline">
                          Ver espaço
                        </Link>
                      </div>

                      {isStaff && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button variant="success" onClick={() => openActionModal(r, "confirmed")}>
                            Confirmar
                          </Button>
                          <Button variant="action" onClick={() => openActionModal(r, "completed")}>
                            Concluir
                          </Button>
                          <Button variant="warning" onClick={() => openActionModal(r, "no_show")}>
                            No-show
                          </Button>
                          <Button variant="danger" onClick={() => openActionModal(r, "cancelled")}>
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {actionOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center px-3">
          <Card className="w-full max-w-md p-4 space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Atualizar reserva</h2>
              <p className="text-sm text-slate-400">
                Defina o status e, se necessário, informe o motivo.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-400">Status</label>
                <select
                  className="w-full mt-1 rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={actionStatus}
                  onChange={(e) => setActionStatus(e.target.value as StaffAction)}
                >
                  <option value="confirmed">confirmed</option>
                  <option value="completed">completed</option>
                  <option value="no_show">no_show</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>

              {(actionStatus === "cancelled" || actionStatus === "no_show") && (
                <div>
                  <label className="text-sm text-slate-400">Motivo *</label>
                  <Input value={actionReason} onChange={(e) => setActionReason(e.target.value)} />
                </div>
              )}

              {actionError && <p className="text-sm text-red-400">{actionError}</p>}

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setActionOpen(false);
                    setActionReservation(null);
                  }}
                  disabled={acting}
                >
                  Voltar
                </Button>

                <Button onClick={submitAction} disabled={acting}>
                  {acting ? "Salvando..." : "Confirmar"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}