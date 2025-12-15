import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth/session";
import { supabaseAdmin } from "@/app/lib/supabase/server-client";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ logged: false });
  }

  if (session.type === "staff") {
    const { data: staff } = await supabaseAdmin
      .from("staff_users")
      .select("id, name, email, role, is_active")
      .eq("id", session.staff_user_id)
      .maybeSingle();

    if (!staff || !staff.is_active) {
      return NextResponse.json({ logged: false });
    }

    return NextResponse.json({
      logged: true,
      type: "staff",
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
      },
    });
  }

  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("id, name, email, phone")
    .eq("id", session.client_id)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ logged: false });
  }

  return NextResponse.json({
    logged: true,
    type: "client",
    client: {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
    },
  });
}
