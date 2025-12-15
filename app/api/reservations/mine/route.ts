import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth/session";
import { supabaseAdmin } from "@/app/lib/supabase/server-client";

export async function GET() {
  const session = await getSession();

  if (!session || session.type !== "client") {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: reservations, error } = await supabaseAdmin
    .from("reservations")
    .select(`
      id,
      start_at,
      end_at,
      status,
      total_price,
      space_id,
      cancel_reason,
      cancelled_at,
      spaces (id, name)
    `)
    .eq("client_id", session.client_id)
    .order("start_at", { ascending: false });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao buscar reservas." }, { status: 500 });
  }

  return NextResponse.json({ reservations: reservations ?? [] });
}
