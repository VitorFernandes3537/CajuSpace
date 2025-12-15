"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { useToast } from "@/app/components/ui/toast";
import { onlyDigits, formatCpfCnpj, formatPhone } from "../lib/utils/helperMask";

type Tab = "client_login" | "client_register" | "staff";

export default function LoginClient() {
  const toast = useToast();
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/";

  const [tab, setTab] = useState<Tab>("client_login");
  const [loading, setLoading] = useState(false);

  // client login
  const [cDocDigits, setCDocDigits] = useState("");

  // client register
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cRegDocDigits, setCRegDocDigits] = useState("");

  // staff
  const [sEmail, setSEmail] = useState("");
  const [sPin, setSPin] = useState("");

  async function clientLogin() {
    const doc = onlyDigits(cDocDigits);
    if (!(doc.length === 11 || doc.length === 14)) {
      toast.error("Informe CPF (11) ou CNPJ (14).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/client-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: doc }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao entrar.");

      toast.success("Sessão iniciada.");
      router.push(next || "/");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function clientRegister() {
    const name = cName.trim();
    const email = cEmail.trim();
    const phone = onlyDigits(cPhone);
    const doc = onlyDigits(cRegDocDigits);

    if (!name) return toast.error("Nome é obrigatório.");
    if (!email) return toast.error("Email é obrigatório.");
    if (!(phone.length === 10 || phone.length === 11)) return toast.error("Telefone inválido (DDD + número).");
    if (!(doc.length === 11 || doc.length === 14)) return toast.error("Informe CPF (11) ou CNPJ (14).");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/client-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, document: doc }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro no cadastro.");

      toast.success("Cadastro concluído e sessão iniciada.");
      router.push("/minhas-reservas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function loginStaff() {
    if (!sEmail.trim() || !sPin.trim()) {
      toast.error("Informe email e PIN.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: sEmail, pin: sPin }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro no login.");

      toast.success("Sessão de equipe iniciada.");
      router.push(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Login</h1>
        <p className="text-sm text-slate-400">
          Cliente entra com CPF/CNPJ. Cadastro cria conta e já inicia sessão. Equipe entra por email + PIN.
        </p>
      </header>

      <div className="flex gap-2 flex-wrap">
        <Button variant={tab === "client_login" ? undefined : "ghost"} onClick={() => setTab("client_login")}>
          Entrar (cliente)
        </Button>
        <Button variant={tab === "client_register" ? undefined : "ghost"} onClick={() => setTab("client_register")}>
          Cadastrar (cliente)
        </Button>
        <Button variant={tab === "staff" ? undefined : "ghost"} onClick={() => setTab("staff")}>
          Sou equipe
        </Button>
      </div>

      {tab === "client_login" && (
        <Card className="space-y-3 p-4">
          <Input
            placeholder="CPF ou CNPJ *"
            inputMode="numeric"
            value={formatCpfCnpj(cDocDigits)}
            onChange={(e) => setCDocDigits(onlyDigits(e.target.value).slice(0, 14))}
          />
          <Button onClick={clientLogin} disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </Card>
      )}

      {tab === "client_register" && (
        <Card className="space-y-3 p-4">
          <Input placeholder="Nome *" value={cName} onChange={(e) => setCName(e.target.value)} />
          <Input placeholder="Email *" value={cEmail} onChange={(e) => setCEmail(e.target.value)} />
          <Input
            placeholder="Telefone *"
            inputMode="numeric"
            value={formatPhone(cPhone)}
            onChange={(e) => setCPhone(onlyDigits(e.target.value).slice(0, 11))}
          />
          <Input
            placeholder="CPF ou CNPJ *"
            inputMode="numeric"
            value={formatCpfCnpj(cRegDocDigits)}
            onChange={(e) => setCRegDocDigits(onlyDigits(e.target.value).slice(0, 14))}
          />
          <Button onClick={clientRegister} disabled={loading}>
            {loading ? "Cadastrando..." : "Cadastrar e entrar"}
          </Button>
        </Card>
      )}

      {tab === "staff" && (
        <Card className="space-y-3 p-4">
          <Input placeholder="Email" value={sEmail} onChange={(e) => setSEmail(e.target.value)} />
          <Input placeholder="PIN" value={sPin} onChange={(e) => setSPin(e.target.value)} />
          <Button onClick={loginStaff} disabled={loading}>
            {loading ? "Entrando..." : "Entrar como equipe"}
          </Button>
        </Card>
      )}
    </section>
  );
}
