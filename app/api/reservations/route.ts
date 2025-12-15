import { NextResponse } from "next/server";
import { createReservation } from "@/app/lib/repository/reservations.repository";
import { createClient } from "@/app/lib/repository/clients.repository";
import { getSession, setSessionOnResponse } from "@/app/lib/auth/session";
import { supabaseAdmin } from "@/app/lib/supabase/server-client";

type ClientInline = {
  id?: string;
  name: string;
  type?: "individual" | "company";
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  notes?: string | null;
};

type CreateReservationBody = {
  space_id: string;
  start_at: string;
  end_at: string;
  people_count?: number | null;
  usage_purpose?: string | null;
  total_price?: number | null;
  source?: "web" | "operator" | "request_approved";

  client_id?: string;
  client?: ClientInline;
};

function isOverlapConstraintError(message: string) {
  return (
    message.includes("reservations_no_overlap") ||
    message.includes("conflicting key value") ||
    message.includes("overlap")
  );
}

function hoursBetween(startISO: string, endISO: string) {
  const s = new Date(startISO).getTime();
  const e = new Date(endISO).getTime();
  const ms = e - s;
  return ms > 0 ? ms / (1000 * 60 * 60) : 0;
}

export async function POST(req: Request) {
  let body: CreateReservationBody;

  try {
    body = (await req.json()) as CreateReservationBody;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  if (!body.space_id || !body.start_at || !body.end_at) {
    return NextResponse.json({ error: "Dados da reserva incompletos." }, { status: 400 });
  }

  if (!body.usage_purpose || !body.usage_purpose.trim()) {
    return NextResponse.json({ error: "Informe a finalidade de uso." }, { status: 400 });
  }

  if (!Number.isFinite(Number(body.people_count)) || Number(body.people_count) <= 0) {
    return NextResponse.json({ error: "Informe a quantidade de pessoas." }, { status: 400 });
  }

  const session = await getSession();

  let clientId = body.client_id;

  if (!clientId && session?.type === "client") {
    clientId = session.client_id;
  }

  if (!clientId && session?.type === "staff" && !body.client) {
    return NextResponse.json(
      { error: "Selecione ou cadastre um cliente para esta reserva.", code: "NEED_CLIENT" },
      { status: 400 }
    );
  }

  let shouldSetClientSession = false;

  if (!clientId) {
    if (!body.client?.name?.trim()) {
      return NextResponse.json({ error: "Informe os dados do cliente." }, { status: 400 });
    }

    const created = await createClient({
      name: body.client.name.trim(),
      type: body.client.type ?? "individual",
      email: body.client.email ?? undefined,
      phone: body.client.phone ?? undefined,
      document: body.client.document ?? undefined,
      notes: body.client.notes ?? undefined,
    });

    clientId = created.id;

    shouldSetClientSession = session?.type !== "staff";
  }

  let totalPrice = body.total_price ?? null;

  if (totalPrice == null) {
    const { data: space, error } = await supabaseAdmin
      .from("spaces")
      .select("default_hourly_price")
      .eq("id", body.space_id)
      .single();

    if (!error) {
      const hourly = Number(space?.default_hourly_price ?? 0);
      const h = hoursBetween(body.start_at, body.end_at);
      if (hourly > 0 && h > 0) totalPrice = Number((hourly * h).toFixed(2));
    }
  }

  try {
    const reservation = await createReservation({
      space_id: body.space_id,
      client_id: clientId!,
      start_at: body.start_at,
      end_at: body.end_at,
      people_count: body.people_count ?? null,
      usage_purpose: body.usage_purpose ?? null,
      total_price: totalPrice,
      source: body.source ?? "web",
      status: "pending",
    });

    const res = NextResponse.json({ ok: true, reservation });

    if (shouldSetClientSession) {
      setSessionOnResponse(res, { type: "client", client_id: clientId! });
    }

    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao criar reserva.";

    if (isOverlapConstraintError(msg)) {
      return NextResponse.json(
        { error: "Este horário acabou de ser reservado. Escolha outro slot." },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Falha ao criar reserva." }, { status: 500 });
  }
}
