"use client";

import React from "react";
import {
  CalendarDays,
  BarChart3,
  Users,
  Scissors,
  Clock,
  UserCheck,
  Package,
  Megaphone,
  CreditCard,
  Settings,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { Business } from "@/lib/types";
import { cn } from "@/lib/utils";

export type AdminTab =
  | "calendar"
  | "stats"
  | "customers"
  | "services"
  | "workschedule"
  | "employees"
  | "products"
  | "marketing"
  | "cashregister"
  | "settings";

interface AdminTopBarProps {
  business: Business;
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onLogout: () => void;
}

export const ADMIN_NAV_ITEMS: {
  id: AdminTab;
  label: string;
  icon: React.ElementType;
  badge?: string;
}[] = [
  { id: "calendar", label: "יומן", icon: CalendarDays },
  { id: "stats", label: "סטטיסטיקות", icon: BarChart3 },
  { id: "customers", label: "לקוחות", icon: Users },
  { id: "services", label: "שירותים", icon: Scissors },
  { id: "workschedule", label: "שעות פעילות", icon: Clock },
  { id: "employees", label: "צוות", icon: UserCheck },
  { id: "marketing", label: "הודעות", icon: Megaphone, badge: "בקרוב" },
  { id: "cashregister", label: "קופה", icon: CreditCard, badge: "בקרוב" },
  { id: "settings", label: "הגדרות", icon: Settings },
];

export const AdminTopBar: React.FC<AdminTopBarProps> = ({
  business,
  activeTab,
  onTabChange,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top row: Brand & Actions */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm shadow-indigo-600/25 flex-shrink-0">
            <Scissors className="w-5 h-5" />
          </div>
          <div className="text-right">
            <div className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight flex items-center gap-2">
              <span>{business.name}</span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                פעיל
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <span className="font-mono text-slate-400">/{business.slug}</span>
              <span className="text-slate-300">•</span>
              <a
                href={`/${business.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1 bg-indigo-50/70 hover:bg-indigo-100/70 px-2 py-0.5 rounded-md transition-colors"
                title="פתח את דף הזימון הציבורי של העסק בלשונית חדשה"
              >
                <span>עמוד העסק</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/${business.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200/80 px-3 py-2 rounded-xl transition-colors border border-slate-200"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>תצוגת לקוח</span>
          </a>

          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-2 rounded-xl hover:bg-rose-100/80 transition-colors font-semibold border border-rose-100"
            title="התנתק מהמערכת"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>התנתק</span>
          </button>
        </div>
      </div>

      {/* Bottom row: RTL 11 Tabs Horizontal Navigation Bar */}
      <div className="border-t border-slate-100 bg-slate-50/60">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1.5 text-xs">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex-shrink-0",
                    isActive
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-slate-500")} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        "text-[9px] px-1.5 py-0.2 rounded-full font-bold leading-tight",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
