import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "cajuspace_session";

function isProtected(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/config")
  );
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isProtected(pathname)) return NextResponse.next();

  const session = req.cookies.get(COOKIE_NAME)?.value;
  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  /* 
     MVP apenas verifica se existe cookie.
     A validação forte (assinatura) é server-only em session.ts.
     Aqui já bloqueia usuário não logado.
  */
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/config/:path*"],
};