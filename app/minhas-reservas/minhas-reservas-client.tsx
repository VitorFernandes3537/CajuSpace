"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { useToast } from "@/app/components/ui/toast";

type MeResponse =
  | { logged: false }
  | {
      logged: true;
      type: "client";
      client: { id: string; name: string; email: string | null; phone: string | null };
    }
  | { logged: true; type: "staff"; staff: { id: string; name: string; email: string; role: string } };

type Reservation = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  total_price: number | null;
  cancel_reason?: string | null;
  cancelled_at?: string | null;
  spaces?: { id: string; name: string } | null;
};

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

function dt(v: string) {
  return new Date(v).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
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
  if (s === "confirmed") return "bg-emerald-500/15! text-emerald-300! border! border-emerald-500/25!";
  if (s === "pending") return "bg-amber-500/15! text-amber-300! border! border-amber-500/25!";
  if (s === "completed") return "bg-sky-500/15! text-sky-300! border! border-sky-500/25!";
  if (s === "cancelled" || s === "no_show") return "bg-rose-500/15! text-rose-300! border! border-rose-500/25!";
  return "bg-slate-500/15! text-slate-300! border! border-slate-500/25!";
}

type CancelPreset = "Desisti" | "Erro de data/horário" | "Imprevisto" | "Outro";

export default function MinhasReservasClient() {
  const [me, setMe] = useState<MeResponse>({ logged: false });
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  // pagamento
  const [payOpen, setPayOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [payReservation, setPayReservation] = useState<Reservation | null>(null);
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  // Cancelamento
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelReservation, setCancelReservation] = useState<Reservation | null>(null);
  const [cancelPreset, setCancelPreset] = useState<CancelPreset>("Desisti");
  const [cancelText, setCancelText] = useState("");

  const toast = useToast();
  const searchParams = useSearchParams();

  async function loadMe() {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    const json = (await res.json()) as MeResponse;
    setMe(json);
    return json;
  }

  async function loadMyReservations() {
    const res = await fetch("/api/reservations/mine", { cache: "no-store" });
    const json = (await res.json()) as { reservations?: Reservation[]; error?: string };
    if (!res.ok) throw new Error(json.error || "Erro ao buscar reservas.");
    setReservations(json.reservations ?? []);
  }

  function openPayModal(r: Reservation) {
    setPayReservation(r);
    setPayError(null);
    setCardName("");
    setCardNumber("");
    setCardExp("");
    setCardCvv("");
    setPayOpen(true);
  }

  async function submitPay() {
    if (!payReservation) return;

    const n = cardName.trim();
    const num = cardNumber.replace(/\D/g, "");
    const exp = cardExp.trim();
    const cvv = cardCvv.replace(/\D/g, "");

    if (!n) return setPayError("Informe o nome no cartão.");
    if (num.length < 12) return setPayError("Número do cartão inválido.");
    if (!/^\d{2}\/\d{2}$/.test(exp)) return setPayError("Validade inválida (MM/AA).");
    if (cvv.length < 3) return setPayError("CVV inválido.");

    setPayError(null);
    setPaying(true);

    try {
      const res = await fetch("/api/reservations/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservation_id: payReservation.id }),
      });

      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json?.ok) throw new Error(json.error || "Falha ao processar pagamento.");

      toast.success("Pagamento confirmado! Sua reserva foi confirmada.");
      setPayOpen(false);
      setPayReservation(null);

      await loadMyReservations();
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Falha ao processar pagamento.");
    } finally {
      setPaying(false);
    }
  }

  function openCancelModal(r: Reservation) {
    setCancelReservation(r);
    setCancelError(null);
    setCancelPreset("Desisti");
    setCancelText("");
    setCancelOpen(true);
  }

  function closeCancelModal() {
    setCancelOpen(false);
    setCancelling(false);
    setCancelError(null);
    setCancelReservation(null);
    setCancelPreset("Desisti");
    setCancelText("");
  }

  async function submitCancel() {
    if (!cancelReservation) return;

    const preset = cancelPreset;
    const reason = preset === "Outro" ? cancelText.trim() : preset.trim();

    if (!reason) {
      setCancelError(preset === "Outro" ? "Descreva o motivo." : "Informe o motivo.");
      return;
    }

    setCancelError(null);
    setCancelling(true);

    try {
      const res = await fetch("/api/reservations/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservation_id: cancelReservation.id,
          reason,
        }),
      });

      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json?.ok) throw new Error(json.error || "Falha ao cancelar.");

      toast.success("Reserva cancelada.");
      closeCancelModal();
      await loadMyReservations();
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : "Falha ao cancelar.");
    } finally {
      setCancelling(false);
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const m = await loadMe();

        if (m.logged && m.type === "staff") {
          setReservations([]);
          return;
        }

        if (m.logged && m.type === "client") {
          await loadMyReservations();
        }
      } catch {
        // mantém deslogado
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const from = searchParams.get("from");
    if (from === "reserve") {
      toast.success("Reserva criada! Faça o pagamento para confirmar.");
    }
  }, [searchParams, toast]);

  const hasPending = useMemo(() => reservations.some((r) => String(r.status) === "pending"), [reservations]);

  if (!loading && (!me.logged || me.type !== "client")) {
    return (
      <section className="space-y-4 cj-container py-10">
        <h1 className="text-2xl font-semibold">Minhas reservas</h1>
        <p className="text-sm text-slate-400">Para ver suas reservas, faça login como cliente.</p>
        <Link href="/login?next=/minhas-reservas">
          <Button>Ir para login</Button>
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6 cj-container py-10">
      <header>
        <h1 className="text-2xl font-semibold">Minhas reservas</h1>
        {me.logged && me.type === "client" && (
          <p className="text-sm text-slate-400">
            Olá, {me.client.name || "Cliente"} — aqui estão suas reservas.
            {hasPending ? " Pague as pendentes para confirmar." : ""}
          </p>
        )}
      </header>

      {loading ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : reservations.length === 0 ? (
        <p className="text-sm text-slate-400">Você ainda não possui reservas.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reservations.map((r) => {
            const status = String(r.status);
            const isPending = status === "pending";
            const isCancelled = status === "cancelled";

            return (
              <Card key={r.id} className="p-5 bg-slate-900/30 border border-slate-800/70 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-400">Espaço</div>
                    <div className="font-semibold text-slate-100">{r.spaces?.name ?? "—"}</div>
                  </div>
                  <Badge className={statusBadgeClass(status)}>{statusLabel(status)}</Badge>
                </div>

                <div>
                  <div className="text-sm text-slate-400">Horário</div>
                  <div className="text-slate-200">
                    {dt(r.start_at)} {" — "} {dt(r.end_at)}
                  </div>
                </div>

                {r.total_price != null && (
                  <div className="text-sm text-slate-400">
                    Total: <span className="text-slate-100 font-semibold">{brl(Number(r.total_price))}</span>
                  </div>
                )}

                {isCancelled && (r.cancel_reason || r.cancelled_at) && (
                  <div className="text-xs text-slate-400">
                    {r.cancel_reason ? (
                      <>
                        Motivo: <span className="text-slate-200">{r.cancel_reason}</span>
                      </>
                    ) : null}
                    {r.cancel_reason && r.cancelled_at ? " • " : ""}
                    {r.cancelled_at ? (
                      <>
                        Em: <span className="text-slate-200">{dt(r.cancelled_at)}</span>
                      </>
                    ) : null}
                  </div>
                )}

                {isPending && (
                  <div className="pt-2 flex flex-col gap-2">
                    <Button onClick={() => openPayModal(r)}>Pagar e confirmar</Button>
                    <Button variant="ghost" onClick={() => openCancelModal(r)}>
                      Cancelar reserva
                    </Button>
                    <p className="text-xs text-slate-500">Pagamento simulado.</p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal pagamento */}
      {payOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center px-3">
          <Card className="w-full max-w-md p-4 space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Pagamento</h2>
              <p className="text-sm text-slate-400">Simulação de pagamento para confirmar a reserva.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-400">Nome no cartão *</label>
                <Input value={cardName} onChange={(e) => setCardName(e.target.value)} />
              </div>

              <div>
                <label className="text-sm text-slate-400">Número do cartão *</label>
                <Input
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="0000 0000 0000 0000"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm text-slate-400">Validade (MM/AA) *</label>
                  <Input value={cardExp} onChange={(e) => setCardExp(e.target.value)} placeholder="12/28" />
                </div>
                <div>
                  <label className="text-sm text-slate-400">CVV *</label>
                  <Input
                    inputMode="numeric"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    placeholder="123"
                  />
                </div>
              </div>

              {payError && <p className="text-sm text-red-400">{payError}</p>}

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setPayOpen(false);
                    setPayReservation(null);
                  }}
                  disabled={paying}
                >
                  Cancelar
                </Button>

                <Button onClick={submitPay} disabled={paying}>
                  {paying ? "Processando..." : "Confirmar pagamento"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal cancelamento */}
      {cancelOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center px-3">
          <Card className="w-full max-w-md p-4 space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Cancelar reserva</h2>
              <p className="text-sm text-slate-400">Informe o motivo do cancelamento.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-400">Motivo *</label>
                <select
                  className="w-full mt-1 rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={cancelPreset}
                  onChange={(e) => {
                    const v = e.target.value as CancelPreset;
                    setCancelPreset(v);
                    if (v !== "Outro") setCancelText("");
                  }}
                >
                  <option value="Desisti">Desisti</option>
                  <option value="Erro de data/horário">Erro de data/horário</option>
                  <option value="Imprevisto">Imprevisto</option>
                  <option value="Outro">Outro</option>
                </select>

                {cancelPreset === "Outro" && (
                  <div className="mt-2">
                    <Input placeholder="Descreva..." value={cancelText} onChange={(e) => setCancelText(e.target.value)} />
                  </div>
                )}
              </div>

              {cancelError && <p className="text-sm text-red-400">{cancelError}</p>}

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={closeCancelModal} disabled={cancelling}>
                  Voltar
                </Button>

                <Button onClick={submitCancel} disabled={cancelling}>
                  {cancelling ? "Cancelando..." : "Confirmar cancelamento"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}
