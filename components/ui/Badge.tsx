import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive" | "outline";
}

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-brand-50 text-brand-700 border-brand-200",
    secondary: "bg-ink-100 text-ink-700 border-ink-200",
    success: "bg-success-100 text-success-700 border-success-200",
    warning: "bg-pending-100 text-pending-700 border-pending-200",
    destructive: "bg-danger-50 text-danger-700 border-danger-200",
    outline: "bg-transparent text-ink-700 border-ink-300",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
