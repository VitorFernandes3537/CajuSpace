"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { useToast } from "@/app/components/ui/toast";
import Link from "next/link";

type MeResponse =
    | { logged: false }
    | {
        logged: true;
        type: "client";
        client: { id: string; name: string; email: string | null; phone: string | null };
    }
    | {
        logged: true;
        type: "staff";
        staff: { id: string; name: string; email: string; role: string };
    };

export default function MiniSessionTab({ me, loading, onChangeSession }: {
    me: MeResponse; loading: boolean;
    onChangeSession: () => Promise<void> | void;
}) {
    const toast = useToast();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const router = useRouter();

    const displayName = useMemo(() => {
        if (!me.logged) return null;
        if (me.type === "staff") return me.staff.name || me.staff.email;
        return me.client.name || me.client.email || me.client.phone || "Cliente";
    }, [me]);

    // Fecha ao clicar fora
    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            const el = rootRef.current;
            if (!el) return;
            if (!el.contains(e.target as Node)) setOpen(false);
        }

        if (open) document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [open]);

    async function logout() {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            setOpen(false);
            toast.success("Você saiu.");
            await onChangeSession();
            router.replace("/");
            router.refresh();
        } catch {
            toast.error("Erro ao sair.");
        }
    }

    const label = loading ? "..." : me.logged ? `Olá, ${displayName}` : "Sessão";

    return (
        <div
            ref={rootRef}
            className="
        fixed z-50 pointer-events-auto
        top-2 right-2
        sm:top-4 sm:right-4"
        >
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="
                    flex items-center gap-2
                    px-3 py-2
                    rounded-full
                    border border-slate-700/70
                    bg-slate-900/40
                    backdrop-blur-2xl
                    shadow-soft
                    text-xs sm:text-sm
                    text-slate-100
                    hover:bg-slate-800/40
                    transition
                    max-w-[68vw] sm:max-w-[340px]"
                >
                    <span className="truncate">{label}</span>
                    <span className="text-slate-300">{open ? "▴" : "▾"}</span>
                </button>

                {/* Dropdown ancorado à direita do botão */}
                {open && (
                    <div
                        className="
                            absolute right-0
                            mt-2
                            w-[92vw] max-w-[320px]"
                    >
                        <Card className="p-3 border border-slate-700/70 bg-slate-950/90 backdrop-blur-2xl">
                            {!me.logged ? (
                                <div className="space-y-3">
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Você pode navegar livremente. Só precisa entrar quando for reservar ou ver suas reservas.
                                    </p>

                                    <Link href="/login" onClick={() => setOpen(false)}>
                                        <Button className="w-full">Ir para login</Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div>
                                        <div className="text-sm font-semibold text-slate-100 truncate">
                                            {displayName}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {me.type === "staff" ? `Equipe • ${me.staff.role}` : "Cliente"}
                                        </div>
                                    </div>

                                    <Button className="w-full" onClick={logout}>
                                        Sair
                                    </Button>
                                </div>
                            )}
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
