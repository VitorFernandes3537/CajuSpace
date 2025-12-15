"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={clsx(
          "w-full rounded-soft border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm",
          "placeholder:text-slate-500 text-slate-100",
          "focus:outline-none focus:ring-2 focus:ring-brand-blue/70 focus:border-brand-blue/60",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
