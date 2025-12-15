import crypto from "crypto";
import type { NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAME = "cajuspace_session";
const SECRET = process.env.SESSION_SECRET || "";

export type SessionPayload =
  | { type: "client"; client_id: string }
  | { type: "staff"; staff_user_id: string; role: string };

function sign(data: string) {
  if (!SECRET) throw new Error("SESSION_SECRET não definido.");
  return crypto.createHmac("sha256", SECRET).update(data).digest("hex");
}

function encode(payload: SessionPayload) {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString("base64url");
  const sig = sign(b64);
  return `${b64}.${sig}`;
}

function decode(value: string): SessionPayload | null {
  const [b64, sig] = value.split(".");
  if (!b64 || !sig) return null;
  if (sign(b64) !== sig) return null;

  try {
    const json = Buffer.from(b64, "base64url").toString("utf-8");
    return JSON.parse(json) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const c = await cookies();
  const v = c.get(COOKIE_NAME)?.value;
  if (!v) return null;
  return decode(v);
}

export function setSessionOnResponse(res: NextResponse, payload: SessionPayload) {
  res.cookies.set(COOKIE_NAME, encode(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionOnResponse(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}
