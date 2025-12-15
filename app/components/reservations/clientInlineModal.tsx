"use client";

import { useMemo, useState } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { onlyDigits, formatCpfCnpj, formatPhone } from "@/app/lib/utils/helperMask";

export type ClientInline = {
  id?: string;
  name: string;
  type?: "individual" | "company";
  email?: string;
  phone: string;
  document: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (client: ClientInline) => Promise<void>;
  noSession?: boolean;
};

type Tab = "login" | "register";

function inferType(documentDigits: string): "individual" | "company" {
  return documentDigits.length >= 14 ? "company" : "individual";
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

async function safeJson(res: Response): Promise<Record<string, unknown>> {
  const raw = await res.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export default function ClientInlineModal({ open, onClose, onConfirm, noSession }: Props) {
  const [tab, setTab] = useState<Tab>("login");

  const [docLoginView, setDocLoginView] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneView, setPhoneView] = useState("");
  const [docRegView, setDocRegView] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const docLoginDigits = useMemo(() => onlyDigits(docLoginView), [docLoginView]);

  const phoneDigits = useMemo(() => onlyDigits(phoneView), [phoneView]);
  const docRegDigits = useMemo(() => onlyDigits(docRegView), [docRegView]);
  const inferredType = useMemo(() => (docRegDigits ? inferType(docRegDigits) : undefined), [docRegDigits]);

  if (!open) return null;

  async function submitLogin() {
    const doc = onlyDigits(docLoginDigits);
    if (!(doc.length === 11 || doc.length === 14)) {
      setError("Informe CPF (11) ou CNPJ (14).");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/client-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: doc, no_session: !!noSession }),
      });

      const json = await safeJson(res);
      const errMsg = typeof json.error === "string" ? json.error : undefined;
      if (!res.ok) throw new Error(errMsg || "Não foi possível entrar.");

      const c = (json.client ?? null) as null | {
        id?: string;
        name?: string;
        email?: string | null;
        phone?: string | null;
        document?: string | null;
        type?: "individual" | "company" | null;
      };

      if (!c?.id || !c?.name) throw new Error("Cliente não retornado pela API.");

      await onConfirm({
        id: c.id,
        name: c.name,
        email: c.email || undefined,
        phone: c.phone || "",
        document: c.document || doc,
        type: c.type || inferType(doc),
      });

      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  async function submitRegister() {
    const n = name.trim();
    const e = email.trim().toLowerCase();
    const p = onlyDigits(phoneDigits);
    const d = onlyDigits(docRegDigits);

    if (!n) return setError("Nome é obrigatório.");
    if (!isValidEmail(e)) return setError("Email inválido.");
    if (!(p.length === 10 || p.length === 11)) return setError("Telefone inválido (DDD + número).");
    if (!(d.length === 11 || d.length === 14)) return setError("Informe CPF (11) ou CNPJ (14).");

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/client-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, email: e, phone: p, document: d, no_session: !!noSession }),
      });

      const json = await safeJson(res);
      const errMsg = typeof json.error === "string" ? json.error : undefined;
      if (!res.ok) throw new Error(errMsg || "Não foi possível cadastrar.");

      const c = (json.client ?? null) as null | {
        id?: string;
        name?: string;
        email?: string | null;
        phone?: string | null;
        document?: string | null;
        type?: "individual" | "company" | null;
      };

      await onConfirm({
        id: c?.id,
        name: c?.name || n,
        email: c?.email || e,
        phone: c?.phone || p,
        document: c?.document || d,
        type: c?.type || inferType(d),
      });

      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao cadastrar.";
      if (msg.includes("já está cadastrado")) {
        setTab("login");
        setDocLoginView(d);
        setError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center px-3">
      <Card className="w-full max-w-md p-4 space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Sessão do cliente</h2>
          <p className="text-sm text-slate-400">Entre para reservar. Se não tiver cadastro, crie em 1 minuto.</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={tab === "login" ? undefined : "ghost"}
            onClick={() => {
              setTab("login");
              setError(null);
            }}
            disabled={loading}
          >
            Entrar
          </Button>
          <Button
            variant={tab === "register" ? undefined : "ghost"}
            onClick={() => {
              setTab("register");
              setError(null);
            }}
            disabled={loading}
          >
            Cadastrar
          </Button>
        </div>

        {tab === "login" ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-400">CPF/CNPJ *</label>
              <Input
                inputMode="numeric"
                value={formatCpfCnpj(docLoginView)}
                onChange={(e) => setDocLoginView(onlyDigits(e.target.value).slice(0, 14))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={submitLogin} disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-400">Nome *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm text-slate-400">Email *</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-slate-400">Telefone *</label>
                <Input
                  inputMode="numeric"
                  value={formatPhone(phoneView)}
                  onChange={(e) => setPhoneView(onlyDigits(e.target.value).slice(0, 11))}
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-400">CPF/CNPJ *</label>
              <Input
                inputMode="numeric"
                value={formatCpfCnpj(docRegView)}
                onChange={(e) => setDocRegView(onlyDigits(e.target.value).slice(0, 14))}
              />
              {!!docRegDigits && (
                <p className="mt-1 text-xs text-slate-500">
                  Tipo detectado: <span className="text-slate-300">{inferredType}</span>
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={submitRegister} disabled={loading}>
                {loading ? "Cadastrando..." : "Cadastrar e entrar"}
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
      </Card>
    </div>
  );
}
