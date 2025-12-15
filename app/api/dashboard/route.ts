import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth/session";
import { supabaseAdmin } from "@/app/lib/supabase/server-client";

function monthRange(now = new Date()) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    return { start: start.toISOString(), end: end.toISOString() };
}

function monthRangeFromParam(month: string | null) {
    if (!month) return monthRange(new Date());

    const m = month.trim(); // "2025-12"
    if (!/^\d{4}-\d{2}$/.test(m)) return monthRange(new Date());

    const [yStr, moStr] = m.split("-");
    const y = Number(yStr);
    const mo = Number(moStr);

    if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) {
        return monthRange(new Date());
    }

    const start = new Date(y, mo - 1, 1, 0, 0, 0, 0);
    const end = new Date(y, mo, 1, 0, 0, 0, 0);
    return { start: start.toISOString(), end: end.toISOString() };
}

function hoursBetween(startISO: string, endISO: string) {
    const s = new Date(startISO).getTime();
    const e = new Date(endISO).getTime();
    const ms = e - s;
    return ms > 0 ? ms / (1000 * 60 * 60) : 0;
}

function pickNameFromJoin(v: unknown): string | null {
    if (!v) return null;

    if (Array.isArray(v)) {
        const first = v[0] as unknown;
        if (first && typeof first === "object" && "name" in first) {
            const name = (first as { name?: unknown }).name;
            return typeof name === "string" ? name : null;
        }
        return null;
    }

    if (typeof v === "object" && "name" in v) {
        const name = (v as { name?: unknown }).name;
        return typeof name === "string" ? name : null;
    }

    return null;
}

export async function GET(req: Request) {
    const session = await getSession();

    if (!session || session.type !== "staff") {
        return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    const url = new URL(req.url);
    const monthParam = url.searchParams.get("month");

    const { start, end } = monthRangeFromParam(monthParam);

    const { data: monthList, error: monthErr } = await supabaseAdmin
        .from("reservations")
        .select("id,start_at,end_at,status,total_price")
        .gte("start_at", start)
        .lt("start_at", end);

    if (monthErr) {
        return NextResponse.json({ ok: false, error: "Falha ao carregar dashboard." }, { status: 500 });
    }

    const revenue_confirmed = (monthList ?? [])
        .filter((r) => r.status === "confirmed")
        .reduce((acc, r) => acc + Number(r.total_price ?? 0), 0);

    const revenue_pending = (monthList ?? [])
        .filter((r) => r.status === "pending")
        .reduce((acc, r) => acc + Number(r.total_price ?? 0), 0);

    const revenue_completed = (monthList ?? [])
        .filter((r) => r.status === "completed")
        .reduce((acc, r) => acc + Number(r.total_price ?? 0), 0);

    const revenue_lost = (monthList ?? [])
        .filter((r) => r.status === "cancelled" || r.status === "no_show")
        .reduce((acc, r) => acc + Number(r.total_price ?? 0), 0);

    const reservations_month = (monthList ?? []).length;

    const booked_hours_month = (monthList ?? []).reduce(
        (acc, r) => acc + hoursBetween(r.start_at, r.end_at),
        0
    );

    const pending_count = (monthList ?? []).filter((r) => r.status === "pending").length;

    const nowISO = new Date().toISOString();

    const { data: upcomingRaw, error: upErr } = await supabaseAdmin
        .from("reservations")
        .select(
            `id,
             start_at,
             end_at,
             status,
             total_price,
             spaces:space_id ( name ),
             clients:client_id ( name )`)
             .gte("start_at", nowISO)
             .order("start_at", { ascending: true })
             .limit(15);
    if (upErr) {
        return NextResponse.json({ ok: false, error: "Falha ao carregar dashboard." }, { status: 500 });
    }

    const upcoming = (upcomingRaw ?? []).map((r: Record<string, unknown>) => ({
        id: String(r.id ?? ""),
        start_at: String(r.start_at ?? ""),
        end_at: String(r.end_at ?? ""),
        status: String(r.status ?? ""),
        total_price: Number(r.total_price ?? 0),
        space_name: pickNameFromJoin(r.spaces) ?? "—",
        client_name: pickNameFromJoin(r.clients),
    }));

    return NextResponse.json({
        ok: true,
        month: monthParam ?? null,
        kpis: {
            revenue_confirmed: Number(revenue_confirmed.toFixed(2)),
            revenue_pending: Number(revenue_pending.toFixed(2)),
            revenue_completed: Number(revenue_completed.toFixed(2)),
            revenue_lost: Number(revenue_lost.toFixed(2)),
            reservations_month,
            booked_hours_month: Number(booked_hours_month.toFixed(2)),
            pending_count,
        },
        upcoming,
    });
}
