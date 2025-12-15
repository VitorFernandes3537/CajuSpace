import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server-client";
import { setSessionOnResponse } from "@/app/lib/auth/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = (body?.email || "").trim().toLowerCase();
  const pin = (body?.pin || "").trim();

  if (!email || !pin) {
    return NextResponse.json({ error: "Informe email e PIN." }, { status: 400 });
  }

  const expected = (process.env.ADMIN_PIN || "").trim();
  if (!expected || pin !== expected) {
    return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
  }

  const { data: staff, error } = await supabaseAdmin
    .from("staff_users")
    .select("id, email, role, is_active")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao validar usuário." }, { status: 500 });
  }

  if (!staff || !staff.is_active) {
    return NextResponse.json({ error: "Usuário não encontrado ou inativo." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, role: staff.role });
  setSessionOnResponse(res, { type: "staff", staff_user_id: staff.id, role: staff.role });
  return res;
}