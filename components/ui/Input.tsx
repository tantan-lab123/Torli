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
            className="block text-sm font-semibold text-ink-800"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            "flex h-12 w-full rounded-lg border border-ink-200 bg-white px-4 py-3 text-base text-ink-900 placeholder:text-ink-400 transition-colors",
            "focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20",
            "disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400",
            error && "border-danger-400 focus:border-danger-500 focus:ring-danger-500/15",
            className
          )}
          {...props}
        />
        {helperText && !error && (
          <p className="text-xs text-ink-600">{helperText}</p>
        )}
        {error && <p role="alert" className="text-xs font-semibold text-danger-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
