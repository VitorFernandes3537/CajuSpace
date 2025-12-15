import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server-client";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("resources")
    .select("id, name, description")
    .order("name", { ascending: true });

  if (error) {
    console.error("Erro ao listar resources:", error);
    return NextResponse.json({ message: "Erro ao listar resources" }, { status: 500 });
  }

  return NextResponse.json({ resources: data ?? [] });
}