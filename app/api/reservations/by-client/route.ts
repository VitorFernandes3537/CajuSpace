import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server-client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const email = searchParams.get("email");
  const phone = searchParams.get("phone");

  if (!email && !phone) {
    return NextResponse.json(
      { error: "Informe email ou telefone." },
      { status: 400 }
    );
  }

  // 1) Busca clientes
  let clientQuery = supabaseAdmin
    .from("clients")
    .select("id, name, email, phone");

  if (email) clientQuery = clientQuery.eq("email", email);
  if (phone) clientQuery = clientQuery.eq("phone", phone);

  const { data: clients, error: clientErr } = await clientQuery;

  if (clientErr) {
    console.error(clientErr);
    return NextResponse.json({ error: "Erro ao buscar cliente." }, { status: 500 });
  }

  if (!clients || clients.length === 0) {
    return NextResponse.json({ reservations: [] });
  }

  const clientIds = clients.map((c) => c.id);

  // 2) Busca reservas desses clientes
  const { data: reservations, error: resErr } = await supabaseAdmin
    .from("reservations")
    .select(`
      id,
      start_at,
      end_at,
      status,
      total_price,
      space_id,
      spaces (id, name)
    `)
    .in("client_id", clientIds)
    .order("start_at", { ascending: false });

  if (resErr) {
    console.error(resErr);
    return NextResponse.json({ error: "Erro ao buscar reservas." }, { status: 500 });
  }

  return NextResponse.json({ reservations: reservations ?? [] });
}