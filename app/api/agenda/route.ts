import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server-client";

function startOfDayISO(dateStr: string) {
  return `${dateStr}T00:00:00.000Z`;
}
function endOfDayISO(dateStr: string) {
  return `${dateStr}T23:59:59.999Z`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = (searchParams.get("date") || "").trim();
  const spaceId = (searchParams.get("spaceId") || "").trim();

  if (!date) {
    return NextResponse.json({ error: "Informe a data (YYYY-MM-DD)." }, { status: 400 });
  }

  let q = supabaseAdmin
    .from("reservations")
    .select(`
      id,
      start_at,
      end_at,
      status,
      total_price,
      space_id,
      client_id,
      cancel_reason,
      cancelled_at,
      spaces (id, name),
      clients (id, name, email, phone)
    `)
    .gte("start_at", startOfDayISO(date))
    .lte("start_at", endOfDayISO(date))
    .order("start_at", { ascending: true });

  if (spaceId) q = q.eq("space_id", spaceId);

  const { data, error } = await q;

  if (error) {
    console.error("agenda error:", error);
    return NextResponse.json({ error: "Erro ao buscar agenda." }, { status: 500 });
  }

  return NextResponse.json({ reservations: data ?? [] });
}
