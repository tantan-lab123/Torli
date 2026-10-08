"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-ink-950/45 transition-opacity animate-in fade-in duration-200"
      />

      {/* Drawer / Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full max-w-lg overflow-hidden bg-white shadow-2xl transition-all",
          "rounded-t-2xl sm:rounded-2xl",
          "max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300 sm:duration-200 sm:zoom-in-95",
          className
        )}
      >
        {/* Mobile drag handle indicator */}
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-ink-300 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3.5">
          <div className="text-right">
            {title && (
              <h2 className="text-lg font-bold text-ink-900">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-ink-600">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="סגירה"
            className="m-press -ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
