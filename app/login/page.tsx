// app/login/page.tsx
import { Suspense } from "react";
import LoginClient from "./login-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense
      fallback={
        <section className="max-w-2xl space-y-6">
          <header>
            <h1 className="text-2xl font-semibold">Login</h1>
            <p className="text-sm text-slate-400">Carregando...</p>
          </header>
        </section>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
