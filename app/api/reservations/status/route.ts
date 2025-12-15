import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth/session";
import { supabaseAdmin } from "@/app/lib/supabase/server-client";

type AllowedStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";

type Body = {
  reservation_id: string;
  status: AllowedStatus;
  reason?: string;
};

function isAllowedStatus(v: string): v is AllowedStatus {
  return v === "pending" || v === "confirmed" || v === "cancelled" || v === "completed" || v === "no_show";
}

export async function POST(req: Request) {
  const session = await getSession();

  if (!session || session.type !== "staff") {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }

  const reservationId = (body.reservation_id || "").trim();
  const statusRaw = String(body.status || "").trim();
  const reason = (body.reason || "").trim();

  if (!reservationId) {
    return NextResponse.json({ ok: false, error: "Reserva inválida." }, { status: 400 });
  }

  if (!isAllowedStatus(statusRaw)) {
    return NextResponse.json({ ok: false, error: "Status inválido." }, { status: 400 });
  }

  const { data: resv, error: getErr } = await supabaseAdmin
    .from("reservations")
    .select("id, status")
    .eq("id", reservationId)
    .single();

  if (getErr || !resv) {
    return NextResponse.json({ ok: false, error: "Reserva não encontrada." }, { status: 404 });
  }

  const nextStatus: AllowedStatus = statusRaw;

  const patch: Record<string, string | null> = { status: nextStatus };

  if (nextStatus === "cancelled" || nextStatus === "no_show") {
    if (!reason) {
      return NextResponse.json({ ok: false, error: "Informe o motivo." }, { status: 400 });
    }
    patch.cancel_reason = reason;
    patch.cancelled_at = new Date().toISOString();
  }

  if (nextStatus !== "cancelled" && nextStatus !== "no_show") {
    patch.cancel_reason = null;
    patch.cancelled_at = null;
  }

  const { error: updErr } = await supabaseAdmin
    .from("reservations")
    .update(patch)
    .eq("id", reservationId);

  if (updErr) {
    return NextResponse.json({ ok: false, error: "Falha ao atualizar reserva." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
