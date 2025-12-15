import { NextResponse } from "next/server";
import { clearSessionOnResponse } from "@/app/lib/auth/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSessionOnResponse(res);
  return res;
}
