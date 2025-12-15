import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server-client";
import { setSessionOnResponse } from "@/app/lib/auth/session";

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

export async function POST(req: Request) {
  let body: { document?: string; no_session?: boolean };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body = (await req.json()) as any;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const doc = onlyDigits(body.document || "");
  const noSession = !!body.no_session;

  if (!(doc.length === 11 || doc.length === 14)) {
    return NextResponse.json({ error: "Informe um CPF/CNPJ válido." }, { status: 400 });
  }

  const { data: client, error } = await supabaseAdmin
    .from("clients")
    .select("id, name, email, phone, document, type")
    .eq("document", doc)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Erro ao validar cliente." }, { status: 500 });
  if (!client) return NextResponse.json({ error: "CPF/CNPJ não encontrado. Cadastre-se." }, { status: 404 });

  const res = NextResponse.json({ ok: true, client });

  if (!noSession) {
    setSessionOnResponse(res, { type: "client", client_id: client.id });
  }

  return res;
}
