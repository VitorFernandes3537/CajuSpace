import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth/session";
import { supabaseAdmin } from "@/app/lib/supabase/server-client";

type Body = {
  reservation_id: string;
};

export async function POST(req: Request) {
  const session = await getSession();

  if (!session || session.type !== "client") {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }

  let body: Body;

  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }

  const reservationId = (body.reservation_id || "").trim();
  if (!reservationId) {
    return NextResponse.json({ ok: false, error: "Reserva inválida." }, { status: 400 });
  }

  const { data: resv, error: getErr } = await supabaseAdmin
    .from("reservations")
    .select("id, client_id, status")
    .eq("id", reservationId)
    .single();

  if (getErr || !resv) {
    return NextResponse.json({ ok: false, error: "Reserva não encontrada." }, { status: 404 });
  }

  if (String(resv.client_id) !== String(session.client_id)) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 403 });
  }

  if (resv.status !== "pending") {
    return NextResponse.json(
      { ok: false, error: "Esta reserva não está pendente de pagamento." },
      { status: 400 }
    );
  }

  const { error: updErr } = await supabaseAdmin
    .from("reservations")
    .update({ status: "confirmed" })
    .eq("id", reservationId);

  if (updErr) {
    return NextResponse.json({ ok: false, error: "Falha ao confirmar pagamento." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
