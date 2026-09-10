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

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2.5">
      {/* Expanded Actions Popover */}
      {isOpen && (
        <div className="flex flex-col items-start gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <button
            onClick={() => {
              triggerHaptic(20);
              setIsOpen(false);
              onNewAppointment();
            }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white text-slate-800 text-xs font-bold shadow-lg border border-slate-200 hover:bg-slate-50 transition-all hover:scale-105"
          >
            <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <CalendarPlus className="w-4 h-4" />
            </div>
            <span>תור חדש ידני (Walk-in)</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic(20);
              setIsOpen(false);
              onBlockTime();
            }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white text-slate-800 text-xs font-bold shadow-lg border border-slate-200 hover:bg-slate-50 transition-all hover:scale-105"
          >
            <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <span>חסימת זמן / הפסקה</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white text-slate-800 text-xs font-bold shadow-lg border border-slate-200 hover:bg-slate-50 transition-all hover:scale-105"
          >
            <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </div>
            <span>{copied ? "הקישור הועתק בהצלחה!" : "שיתוף עמוד העסק"}</span>
          </button>
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        onClick={toggle}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/30",
          isOpen
            ? "bg-slate-800 rotate-90 hover:bg-slate-900"
            : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/35 hover:scale-105"
        )}
        aria-label="פעולות מהירות"
        title="פעולות מהירות (+)"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>
    </div>
  );
};
