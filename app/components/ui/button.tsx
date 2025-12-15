"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "action" | "success" | "warning" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: clsx(
    "text-slate-950",
    "bg-gradient-to-r from-brand-orange/95 via-amber-300/85 to-orange-200/75",
    "shadow-soft hover:shadow-card",
    "hover:brightness-110 active:brightness-105",
    "border border-white/10"
  ),

  secondary: clsx(
    "text-slate-950",
    "bg-gradient-to-r from-caju-700/95 via-caju-600/85 to-brand-orange/70",
    "shadow-soft hover:shadow-card",
    "hover:brightness-110 active:brightness-105",
    "border border-white/10"
  ),

  ghost: clsx(
    "bg-slate-950/20",
    "border border-slate-700/80 text-slate-100",
    "hover:bg-slate-900/60"
  ),

  action: clsx(
    "text-slate-100",
    "bg-slate-950/25",
    "border border-slate-700/80",
    "hover:bg-slate-900/60"
  ),

  success: clsx(
    "text-emerald-100",
    "bg-emerald-500/15",
    "border border-emerald-500/30",
    "hover:bg-emerald-500/22"
  ),

  warning: clsx(
    "text-amber-100",
    "bg-amber-500/15",
    "border border-amber-500/30",
    "hover:bg-amber-500/22"
  ),

  danger: clsx(
    "text-rose-100",
    "bg-rose-500/15",
    "border border-rose-500/30",
    "hover:bg-rose-500/22"
  ),
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className, fullWidth, disabled, ...props }, ref) => {
    const hasGlow = variant === "primary" || variant === "secondary";

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={clsx(
          "relative inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold",
          "rounded-2xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/70",
          fullWidth && "w-full",
          variantClasses[variant],
          disabled && "opacity-60 cursor-not-allowed",
          hasGlow && "overflow-hidden",
          className
        )}
        {...props}
      >
        {hasGlow && (
          <span
            className={clsx(
              "pointer-events-none absolute inset-0",
              "opacity-60",
              "bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]"
            )}
          />
        )}

        <span className="relative">{props.children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";
