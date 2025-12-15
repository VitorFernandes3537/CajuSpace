import { ReactNode } from "react";
import clsx from "clsx";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "outline";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  const base = "inline-flex items-center rounded-pill px-3 py-0.5 text-xs";

  const styles =
    variant === "default"
      ? "bg-slate-800 text-slate-100 border border-slate-700"
      : variant === "success"
      ? "bg-emerald-500/35 text-emerald-300 border border-emerald-500/65"
      : "border border-slate-600 text-slate-300";

  return <span className={clsx(base, styles, className)}>{children}</span>;
}