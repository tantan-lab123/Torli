import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, label, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.replace(/\s+/g, "-").toLowerCase() : undefined);

    return (
      <div className="w-full space-y-1.5 text-right">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-slate-700"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            "flex h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 transition-all",
            "focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/15",
            "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
            error && "border-red-400 focus:border-red-500 focus:ring-red-500/15",
            className
          )}
          {...props}
        />
        {helperText && !error && (
          <p className="text-xs text-slate-500">{helperText}</p>
        )}
        {error && <p className="text-xs font-medium text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
