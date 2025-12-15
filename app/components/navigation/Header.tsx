"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import MiniSessionTab from "./MiniSessionTab";

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

const links = [
  { href: "/espacos", label: "Espaços", show: "all" as const },
  { href: "/reservar", label: "Reservar", show: "all" as const },
  { href: "/agenda", label: "Agenda", show: "staff" as const },
  { href: "/minhas-reservas", label: "Minhas Reservas", show: "client" as const },
  { href: "/dashboard", label: "Dashboard", show: "staff" as const },
  { href: "/admin/espacos", label: "Admin", show: "admin" as const },
];

export function Header() {
  const pathname = usePathname();

  const [me, setMe] = useState<MeResponse>({ logged: false });
  const [loadingMe, setLoadingMe] = useState(true);

  async function loadMe() {
    setLoadingMe(true);
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const json = (await res.json()) as MeResponse;
      setMe(json);
    } catch {
      setMe({ logged: false });
    } finally {
      setLoadingMe(false);
    }
  }

  useEffect(() => {
    loadMe();
  }, [pathname]);

  const isStaff = me.logged && me.type === "staff";
  const isAdmin = isStaff && me.staff.role === "admin";

  const visibleLinks = useMemo(() => {
    return links.filter((l) => {
      if (l.show === "all") return true;
      if (l.show == "client") return !isStaff;
      if (l.show === "staff") return isStaff;
      if (l.show === "admin") return isAdmin;
      return false;
    });
  }, [isStaff, isAdmin]);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  const baseLink = "px-3 py-1 rounded-full text-xs sm:text-sm transition-colors";
  const activeLink = "bg-brand-orange text-slate-950 shadow-soft";
  const inactiveLink = "text-slate-100 hover:bg-slate-800/70";

  return (
    <>
      {/* Header flutuante */}
      <div className="fixed top-4 left-0 right-0 z-40 flex justify-center pointer-events-none">
        <nav
          className="
            pointer-events-auto
            flex items-center gap-4 sm:gap-6
            px-4 sm:px-6 py-2
            bg-slate-900/20
            border border-slate-700/90
            rounded-3xl
            backdrop-blur-2xl
            shadow-soft"
        >
          {/* Logo */}
          <Link href="/" className={"flex items-center gap-2 mr-4 text-sm font-semibold"}>
            <Image
              src="/CajuSpace-Icon.png"
              alt="CajuSpace"
              width={30}
              height={30}
              className="drop-shadow"
            />
            <span className="hidden sm:inline text-sm font-semibold">
              <span className="text-brand-blue">Caju</span>
              <span className="text-brand-orange">Space</span>
            </span>
          </Link>

          {/* Links/Caminhos do Header */}
          <ul className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
            <li>
              <Link
                href="/"
                className={clsx(baseLink, isActive("/") ? activeLink : inactiveLink)}
              >
                Início
              </Link>
            </li>

            {visibleLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={clsx(baseLink, isActive(link.href) ? activeLink : inactiveLink)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Abinha separada no canto superior direito */}
      <MiniSessionTab me={me} loading={loadingMe} onChangeSession={loadMe} />
    </>
  );
}
