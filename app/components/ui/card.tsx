import { ReactNode } from "react";
import clsx from "clsx";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl bg-slate-900/70 border border-slate-800 shadow-card p-4",
        className
      )}
    >
      {children}
    </div>
  );
}