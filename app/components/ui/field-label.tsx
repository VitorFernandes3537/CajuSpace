import { ReactNode } from "react";

interface FieldLabelProps {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  helperText?: string;
}

export function Field({ label, htmlFor, children, helperText }: FieldLabelProps) {
  return (
    <div className="space-y-1 text-sm">
      <label
        htmlFor={htmlFor}
        className="block text-xs font-medium uppercase tracking-wide text-slate-400"
      >
        {label}
      </label>
      {children}
      {helperText && (
        <p className="text-xs text-slate-500 mt-0.5">{helperText}</p>
      )}
    </div>
  );
}
