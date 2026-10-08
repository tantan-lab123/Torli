"use client";

import React, { useState } from "react";
import { Plus, X, CalendarPlus, Clock, Share2, Check } from "lucide-react";
import { cn, triggerHaptic } from "@/lib/utils";

interface AdminFABProps {
  businessSlug: string;
  businessName: string;
  onNewAppointment: () => void;
  onBlockTime: () => void;
}

export const AdminFAB: React.FC<AdminFABProps> = ({
  businessSlug,
  businessName,
  onNewAppointment,
  onBlockTime,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggle = () => {
    triggerHaptic(15);
    setIsOpen(!isOpen);
  };

  const handleShare = async () => {
    triggerHaptic(20);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/${businessSlug}`;
    const text = `היי, קובעים תור בקלות ביומן של ${businessName}:\n${url}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: businessName,
          text,
          url,
        });
        setIsOpen(false);
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setIsOpen(false);
      }, 1800);
    } catch {
      // ignore
    }
  };

  const action =
    "m-press flex items-center gap-2.5 h-12 px-4 rounded-xl bg-white text-ink-900 text-sm font-semibold shadow-lg border border-ink-200 hover:bg-ink-50 whitespace-nowrap";
  const actionIcon = "w-8 h-8 rounded-lg flex items-center justify-center flex-none";

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[45] bg-ink-950/25 animate-in fade-in"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
      {/* Phone: docked in the middle of the bottom tab bar. Desktop: floating at the corner. */}
      <div
        className="fixed z-50 flex flex-col items-center gap-2.5 left-1/2 -translate-x-1/2 md:left-6 md:translate-x-0 md:items-start bottom-[calc(env(safe-area-inset-bottom)+8px)] md:bottom-6"
      >
        {isOpen && (
          <div className="flex flex-col items-stretch md:items-start gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <button
              onClick={() => {
                triggerHaptic(20);
                setIsOpen(false);
                onNewAppointment();
              }}
              className={action}
            >
              <span className={cn(actionIcon, "bg-brand-50 text-brand-600")}>
                <CalendarPlus className="w-[18px] h-[18px]" />
              </span>
              <span>תור חדש</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic(20);
                setIsOpen(false);
                onBlockTime();
              }}
              className={action}
            >
              <span className={cn(actionIcon, "bg-pending-100 text-pending-700")}>
                <Clock className="w-[18px] h-[18px]" />
              </span>
              <span>חסימת זמן או הפסקה</span>
            </button>

            <button onClick={handleShare} className={action}>
              <span className={cn(actionIcon, "bg-ink-100 text-ink-700")}>
                {copied ? <Check className="w-[18px] h-[18px] text-success-600" /> : <Share2 className="w-[18px] h-[18px]" />}
              </span>
              <span>{copied ? "הקישור הועתק" : "שיתוף הקישור להזמנה"}</span>
            </button>
          </div>
        )}

        {/* Main trigger: a lime-on-green key */}
        <button
          onClick={toggle}
          aria-expanded={isOpen}
          className={cn(
            "m-fab m-key w-14 h-14 rounded-2xl flex items-center justify-center focus:outline-none",
            isOpen ? "bg-ink-900 text-white" : "bg-brand-600 text-lime"
          )}
          aria-label={isOpen ? "סגירת הפעולות" : "תור חדש ופעולות מהירות"}
          title="תור חדש ופעולות מהירות"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-7 h-7" strokeWidth={2.4} />}
        </button>
        <span className="md:hidden -mt-1.5 text-[11px] font-semibold text-brand-600 pointer-events-none" aria-hidden="true">
          {isOpen ? "" : "תור חדש"}
        </span>
      </div>
    </>
  );
};
