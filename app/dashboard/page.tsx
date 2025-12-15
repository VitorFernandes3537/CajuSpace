"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import Link from "next/link";
import { useToast } from "@/app/components/ui/toast";

type DashboardKpis = {
    revenue_confirmed: number;
    revenue_pending: number;
    revenue_completed: number;
    revenue_lost: number;
    reservations_month: number;
    booked_hours_month: number;
    pending_count: number;
};

type UpcomingReservation = {
    id: string;
    space_name: string;
    client_name: string | null;
    start_at: string;
    end_at: string;
    status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show" | string;
    total_price: number;
};

type DashboardResponse =
    | { ok: true; kpis: DashboardKpis; upcoming: UpcomingReservation[] }
    | { ok: false; error: string };

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
    if (s === "confirmed") return "!bg-emerald-500/15 !text-emerald-300 !border !border-emerald-500/25";
    if (s === "pending") return "!bg-amber-500/15 !text-amber-300 !border !border-amber-500/25";
    if (s === "completed") return "!bg-sky-500/15 !text-sky-300 !border !border-sky-500/25";
    if (s === "cancelled" || s === "no_show")
        return "!bg-rose-500/15 !text-rose-300 !border !border-rose-500/25";
    return "!bg-slate-500/15 !text-slate-300 !border !border-slate-500/25";
}

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [kpis, setKpis] = useState<DashboardKpis>({
        revenue_confirmed: 0,
        revenue_pending: 0,
        revenue_completed: 0,
        revenue_lost: 0,
        reservations_month: 0,
        booked_hours_month: 0,
        pending_count: 0,
    });

    const [upcoming, setUpcoming] = useState<UpcomingReservation[]>([]);
    const toast = useToast();

    const [month, setMonth] = useState(() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        return `${y}-${m}`;
    });

    async function loadDashboard() {
        setLoading(true);
        setError(null);

        try {
            const qs = new URLSearchParams({ month });
            const res = await fetch(`/api/dashboard?${qs.toString()}`, { cache: "no-store" });
            const json = (await res.json()) as DashboardResponse;

            if (!res.ok) {
                setError("Falha ao carregar dashboard.");
                return;
            }

            if (!json.ok) {
                setError(json.error);
                return;
            }

            setKpis(json.kpis);
            setUpcoming(json.upcoming ?? []);
        } catch {
            setError("Falha ao carregar dashboard.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadDashboard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const monthLabel = useMemo(() => {
        // month = "YYYY-MM"
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            const d = new Date();
            return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        }

        const [yStr, mStr] = month.split("-");
        const y = Number(yStr);
        const m = Number(mStr);
        const d = new Date(y, m - 1, 1);
        return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    }, [month]);

    return (
        <section className="cj-container py-10 space-y-8">
            <header className="flex items-start justify-between gap-4">
                <div>
                    <Badge className="bg-emerald-500/15! text-emerald-300! border! border-emerald-500/25!">
                        Admin • Dashboard
                    </Badge>

                    <h1 className="mt-4 text-3xl font-semibold">Visão geral</h1>
                    <p className="mt-1 text-sm text-slate-400">Resumo de faturamento e reservas — {monthLabel}.</p>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="border rounded px-3 py-3 bg-slate-950 text-slate-100 border-slate-700"
                    />

                    <Link
                        href="/admin/espacos"
                        className="rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-2 text-sm text-slate-100 hover:bg-slate-900/70"
                    >
                        Admin
                    </Link>

                    <Button
                        variant="ghost"
                        onClick={async () => {
                            await loadDashboard();
                            toast.success("Dashboard atualizado.");
                        }}
                    >
                        Atualizar
                    </Button>
                </div>
            </header>

            {error && (
                <Card className="p-4 border border-red-500/30 bg-red-500/10">
                    <p className="text-sm text-red-300">{error}</p>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5 bg-slate-900/30 border border-slate-800/70">
                    <p className="text-sm text-slate-400">Receita confirmada</p>
                    <div className="mt-2 flex items-end justify-between gap-2">
                        <p className="text-2xl font-semibold">{loading ? "—" : brl(kpis.revenue_confirmed)}</p>
                        <Badge className="bg-emerald-500/15! text-emerald-300! border! border-emerald-500/25!">
                            confirmadas
                        </Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Status “confirmed”.</p>
                </Card>

                <Card className="p-5 bg-slate-900/30 border border-slate-800/70">
                    <p className="text-sm text-slate-400">Receita pendente</p>
                    <div className="mt-2 flex items-end justify-between gap-2">
                        <p className="text-2xl font-semibold">{loading ? "—" : brl(kpis.revenue_pending)}</p>
                        <Badge className="bg-amber-500/15! text-amber-300! border! border-amber-500/25!">
                            {loading ? "—" : `${kpis.pending_count} pend.`}
                        </Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Status “pending”.</p>
                </Card>

                <Card className="p-5 bg-slate-900/30 border border-slate-800/70">
                    <p className="text-sm text-slate-400">Receita realizada</p>
                    <div className="mt-2 flex items-end justify-between gap-2">
                        <p className="text-2xl font-semibold">{loading ? "—" : brl(kpis.revenue_completed)}</p>
                        <Badge className="bg-sky-500/15! text-sky-300! border! border-sky-500/25!">
                            concluídas
                        </Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Status “completed”.</p>
                </Card>

                <Card className="p-5 bg-slate-900/30 border border-slate-800/70">
                    <p className="text-sm text-slate-400">Canceladas / no-show</p>
                    <div className="mt-2 flex items-end justify-between gap-2">
                        <p className="text-2xl font-semibold">{loading ? "—" : brl(kpis.revenue_lost)}</p>
                        <Badge className="bg-rose-500/15! text-rose-300! border! border-rose-500/25!">
                            perdas
                        </Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Status “cancelled” e “no_show”.</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-5 bg-slate-900/30 border border-slate-800/70">
                    <p className="text-sm text-slate-400">Reservas no mês</p>
                    <p className="mt-2 text-2xl font-semibold">{loading ? "—" : kpis.reservations_month}</p>
                    <p className="mt-2 text-xs text-slate-400">Total no período.</p>
                </Card>

                <Card className="p-5 bg-slate-900/30 border border-slate-800/70">
                    <p className="text-sm text-slate-400">Horas reservadas</p>
                    <div className="mt-2 flex items-end justify-between gap-2">
                        <p className="text-2xl font-semibold">
                            {loading ? "—" : `${(kpis.booked_hours_month || 0).toFixed(1)}h`}
                        </p>
                        <Badge className="bg-violet-500/15! text-violet-300! border! border-violet-500/25!">
                            ocupação
                        </Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Soma de duração das reservas do mês.</p>
                </Card>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Próximas reservas</h2>
                    <Link href="/agenda" className="text-sm text-brand-blue hover:underline">
                        Ver agenda
                    </Link>
                </div>

                <Card className="bg-slate-900/30 border border-slate-800/70 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-900/60">
                                <tr className="text-left text-slate-300">
                                    <th className="px-4 py-3 font-medium">Espaço</th>
                                    <th className="px-4 py-3 font-medium">Cliente</th>
                                    <th className="px-4 py-3 font-medium">Início</th>
                                    <th className="px-4 py-3 font-medium">Fim</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium text-right">Total</th>
                                </tr>
                            </thead>

                            <tbody>
                                {!loading && upcoming.length === 0 ? (
                                    <tr>
                                        <td className="px-4 py-6 text-slate-400" colSpan={6}>
                                            Sem reservas futuras.
                                        </td>
                                    </tr>
                                ) : (
                                    upcoming.map((r) => (
                                        <tr key={r.id} className="border-t border-slate-800/70">
                                            <td className="px-4 py-3 text-slate-100">{r.space_name}</td>
                                            <td className="px-4 py-3 text-slate-300">{r.client_name ?? "-"}</td>
                                            <td className="px-4 py-3 text-slate-300">{dt(r.start_at)}</td>
                                            <td className="px-4 py-3 text-slate-300">{dt(r.end_at)}</td>
                                            <td className="px-4 py-3">
                                                <Badge className={statusBadgeClass(r.status)}>{statusLabel(r.status)}</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-100">{brl(r.total_price)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between px-4 py-3 bg-slate-900/40 border-t border-slate-800/70">
                        <p className="text-xs text-slate-400">Baseado nas reservas registradas no sistema.</p>
                        <Link href="/admin/espacos" className="text-xs text-brand-blue hover:underline">
                            Abrir admin
                        </Link>
                    </div>
                </Card>
            </div>
        </section>
    );
}
