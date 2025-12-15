import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server-client";
import { setSessionOnResponse } from "@/app/lib/auth/session";

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

function isValidPhoneBR(digits: string) {
  return digits.length === 10 || digits.length === 11;
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function inferClientType(docDigits: string): "individual" | "company" {
  return docDigits.length >= 14 ? "company" : "individual";
}

export async function POST(req: Request) {
  let body: { name?: string; email?: string; phone?: string; document?: string; no_session?: boolean };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body = (await req.json()) as any;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const noSession = !!body.no_session;

  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const phone = onlyDigits(body.phone || "");
  const doc = onlyDigits(body.document || "");

  if (!name) return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  if (!isValidEmail(email)) return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  if (!isValidPhoneBR(phone)) return NextResponse.json({ error: "Telefone inválido (DDD + número)." }, { status: 400 });
  if (!(doc.length === 11 || doc.length === 14)) return NextResponse.json({ error: "CPF/CNPJ inválido." }, { status: 400 });

  const type = inferClientType(doc);

  const { data: created, error: insertErr } = await supabaseAdmin
    .from("clients")
    .insert({ name, email, phone, document: doc, type })
    .select("id, name, email, phone, document, type")
    .single();

  if (insertErr) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const code = (insertErr as any)?.code;
    if (code === "23505") {
      return NextResponse.json({ error: "Este CPF/CNPJ já está cadastrado. Use 'Entrar'." }, { status: 409 });
    }
    console.error("Erro ao criar cliente:", insertErr);
    return NextResponse.json({ error: "Não foi possível criar o cliente." }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true, client: created });

  if (!noSession) {
    setSessionOnResponse(res, { type: "client", client_id: created.id });
  }

  return res;
}
