"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Clock,
  Phone,
  MessageCircle,
  Plus,
  Ban,
  XCircle,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  Trash2,
  Send,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Lock,
  CalendarX,
  Palmtree,
  KeyRound,
  Check,
  History,
  Dices,
} from "lucide-react";
import {
  Business,
  Service,
  Appointment,
  DayOfWeek,
  DateOverride,
  Employee,
  Product,
  MarketingMessage,
  Client,
  WorkingHours,
  DayHours,
} from "@/lib/types";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  formatHebrewDate,
  formatTime,
  formatPhone,
  toInternationalPhone,
  triggerHaptic,
  cn,
  validatePassword,
  validatePhoneNumber,
  formatJewishDate,
  getJewishHolidayOrShabbat,
  getHebrewDayLetter,
  generateRandomSlug,
} from "@/lib/utils";
import { supabase } from "@/lib/db/supabase";
import {
  addDays,
  subDays,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  startOfWeek,
  format,
  isSameDay,
  isBefore,
  startOfToday,
  parseISO,
} from "date-fns";
import { he } from "date-fns/locale";
import { AdminTopBar, AdminTab } from "@/components/admin/AdminTopBar";
import { AdminFAB } from "@/components/admin/AdminFAB";
import { CustomersSection } from "@/components/admin/CustomersSection";
import { StatsSection } from "@/components/admin/StatsSection";
import { EmployeesSection } from "@/components/admin/EmployeesSection";
import { ProductsSection } from "@/components/admin/ProductsSection";
import { MarketingSection } from "@/components/admin/MarketingSection";
import { CashRegisterSection } from "@/components/admin/CashRegisterSection";
import { WorkScheduleSection } from "@/components/admin/WorkScheduleSection";
import { ServicesSection } from "@/components/admin/ServicesSection";
import { SettingsSection } from "@/components/admin/SettingsSection";
import {
  DEFAULT_EMPLOYEES,
  DEFAULT_PRODUCTS,
  DEFAULT_MARKETING_MESSAGES,
} from "@/lib/mock-saas";

const ADMIN_SESSION_KEY = "schedule_active_business_slug_v2";

export default function AdminDashboardPage() {
  // Businesses & active business
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active TopBar Tab (11 core areas)
  const [activeTab, setActiveTab] = useState<AdminTab>("calendar");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all");

  // SaaS domain collections - start empty for new businesses!
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS.default);
  const [marketingMessages, setMarketingMessages] = useState<MarketingMessage[]>(DEFAULT_MARKETING_MESSAGES);
  const [customClients, setCustomClients] = useState<Client[]>([]);

  // Onboarding / Setup Wizard state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  // Unique CRM Clients computed from appointments + custom created clients
  const clients = useMemo(() => {
    const map = new Map<string, Client>();
    appointments.forEach((app) => {
      if (app.client) {
        map.set(app.client.id, app.client);
      } else if (app.client_id) {
        if (!map.has(app.client_id)) {
          map.set(app.client_id, {
            id: app.client_id,
            business_id: selectedBusiness?.id || "",
            first_name: "לקוח",
            last_name: `#${app.client_id.slice(-4)}`,
            phone: "050-0000000",
          });
        }
      }
    });
    customClients.forEach((c) => map.set(c.id, c));
    return Array.from(map.values());
  }, [appointments, customClients, selectedBusiness]);

  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());

  // Schedule sub-mode: 'day' = detailed day timeline, 'month' = full month calendar & batch closure
  const [scheduleMode, setScheduleMode] = useState<"day" | "month">("day");
  const [ownerMonth, setOwnerMonth] = useState<Date>(startOfToday());

  // Range Closure Modal (Closing week/holiday/vacation at once)
  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);
  const [rangeStartDate, setRangeStartDate] = useState(format(startOfToday(), "yyyy-MM-dd"));
  const [rangeEndDate, setRangeEndDate] = useState(format(addDays(startOfToday(), 6), "yyyy-MM-dd"));
  const [rangeReason, setRangeReason] = useState("חופשה / שבוע סגור");
  const [isSubmittingRange, setIsSubmittingRange] = useState(false);

  // Day Action Modal (Clicking on a specific day in owner's month view)
  const [dayActionModalDate, setDayActionModalDate] = useState<Date | null>(null);

  // Private SaaS Login & Registration State
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [googleUser, setGoogleUser] = useState<{
    email: string;
    id: string;
    name?: string;
  } | null>(null);

  // New Business Registration Form
  const [regName, setRegName] = useState("");
  const [regSlug, setRegSlug] = useState(() => generateRandomSlug(6));
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regInterval, setRegInterval] = useState("15");
  const [regCategory, setRegCategory] = useState<"barber" | "nails" | "therapy" | "general">("barber");
  const [isRegistering, setIsRegistering] = useState(false);
  const [regError, setRegError] = useState("");
  const [isOnboardingHours, setIsOnboardingHours] = useState(false);
  const [isSavingOnboardingHours, setIsSavingOnboardingHours] = useState(false);

  // Real-time password validation for registration
  const passwordValidation = useMemo(() => {
    return validatePassword(regPassword);
  }, [regPassword]);

  // Modals state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isBlockTimeOpen, setIsBlockTimeOpen] = useState(false);
  const [isReminderRunning, setIsReminderRunning] = useState(false);
  const [reminderResult, setReminderResult] = useState<Record<string, unknown> | null>(null);

  // Quick Add / Walk-in form
  const [walkinServiceId, setWalkinServiceId] = useState("");
  const [walkinFirstName, setWalkinFirstName] = useState("");
  const [walkinLastName, setWalkinLastName] = useState("");
  const [walkinPhone, setWalkinPhone] = useState("");
  const [walkinTime, setWalkinTime] = useState("10:00");
  const [isSubmittingWalkin, setIsSubmittingWalkin] = useState(false);

  // Block Time form
  const [blockReason, setBlockReason] = useState("הפסקת צהריים");
  const [blockStartTime, setBlockStartTime] = useState("13:00");
  const [blockEndTime, setBlockEndTime] = useState("14:00");
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);

  // Working hours, Interval, and Overrides editing state
  const [editingWorkingHours, setEditingWorkingHours] = useState<Business["working_hours"] | null>(null);
  const [editingInterval, setEditingInterval] = useState<number>(15);
  const [editingOverrides, setEditingOverrides] = useState<DateOverride[]>([]);

  // Restore saved session on mount
  useEffect(() => {
    const restoreSession = async () => {
      // If user explicitly logged out in this browser session, do not auto-restore!
      if (sessionStorage.getItem("torli_user_logged_out") === "true") {
        setIsLoading(false);
        return;
      }

      const savedSlug = localStorage.getItem(ADMIN_SESSION_KEY);
      if (!savedSlug) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/business?slug=${savedSlug}`);
        if (res.ok) {
          const biz = await res.json();
          setSelectedBusiness(biz);
          setEditingWorkingHours(biz.working_hours);
          setEditingInterval(biz.slot_interval_minutes || 15);
          setEditingOverrides(biz.date_overrides || []);
        } else {
          localStorage.removeItem(ADMIN_SESSION_KEY);
        }
      } catch (err) {
        console.error("Failed to restore admin session:", err);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  // Listen for Supabase OAuth return (e.g. Google Sign-In)
  useEffect(() => {
    if (!supabase) return;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // If user explicitly logged out, do NOT auto-login from cached session!
        if (sessionStorage.getItem("torli_user_logged_out") === "true") {
          return;
        }

        if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user?.email && !selectedBusiness) {
          try {
            setIsLoggingIn(true);
            const res = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                provider: "google",
                email: session.user.email,
                googleId: session.user.id,
              }),
            });

            const data = await res.json();
            if (res.ok && data.business) {
              setSelectedBusiness(data.business);
              setEditingWorkingHours(data.business.working_hours);
              setEditingInterval(data.business.slot_interval_minutes || 15);
              setEditingOverrides(data.business.date_overrides || []);
              localStorage.setItem(ADMIN_SESSION_KEY, data.business.slug);
              triggerHaptic(45);
            } else {
              // User signed in with Google, but hasn't created their business yet!
              const gUser = {
                email: session.user.email,
                id: session.user.id,
                name:
                  (session.user.user_metadata?.full_name as string) ||
                  (session.user.user_metadata?.name as string) ||
                  "",
              };
              setGoogleUser(gUser);
              setAuthTab("register");
              setRegEmail(session.user.email);
              if (gUser.name) {
                setRegName((prev) => prev || `עסק ${gUser.name}`);
              }
              setRegSlug((prev) => prev || generateRandomSlug(6));
              setLoginError("");
            }
          } catch (e) {
            console.error("Google login check error:", e);
          } finally {
            setIsLoggingIn(false);
          }
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [selectedBusiness]);

  // Handle Private Owner Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    sessionStorage.removeItem("torli_user_logged_out");
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);
    triggerHaptic(20);

    if (!loginPhone.trim() || !loginPassword.trim()) {
      setLoginError("יש להזין מספר טלפון וסיסמה");
      setIsLoggingIn(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: loginPhone.trim(),
          password: loginPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "מספר טלפון או סיסמה שגויים");
        setIsLoggingIn(false);
        return;
      }

      // Success
      const biz: Business = data.business;
      setSelectedBusiness(biz);
      setEditingWorkingHours(biz.working_hours);
      setEditingInterval(biz.slot_interval_minutes || 15);
      setEditingOverrides(biz.date_overrides || []);
      localStorage.setItem(ADMIN_SESSION_KEY, biz.slug);
      triggerHaptic(40);
    } catch (err) {
      console.error(err);
      setLoginError("שגיאת תקשורת");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Google Sign-in for Business Owner
  const handleGoogleOwnerLogin = async () => {
    sessionStorage.removeItem("torli_user_logged_out");
    setLoginError("");
    setIsLoggingIn(true);
    triggerHaptic(20);

    try {
      if (!supabase) {
        setLoginError("חיבור Supabase אינו מוגדר בסביבה זו.");
        setIsLoggingIn(false);
        return;
      }

      const redirectUrl = typeof window !== "undefined" ? `${window.location.origin}/admin` : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        if (
          error.message?.toLowerCase().includes("not enabled") ||
          error.message?.toLowerCase().includes("unsupported") ||
          error.message?.toLowerCase().includes("disabled")
        ) {
          setLoginError(
            "ספק Google טרם הופעל בלוח הבקרה של Supabase. יש להפעיל את Google ב-Authentication -> Providers (הסבר מלא זמין במדריך)."
          );
        } else {
          setLoginError(error.message || "שגיאה בהתחברות עם Google");
        }
        setIsLoggingIn(false);
      }
    } catch (err) {
      console.error(err);
      setLoginError("שגיאת תקשורת בהתחברות Google");
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    sessionStorage.setItem("torli_user_logged_out", "true");
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
    }
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setLoginPassword("");
    setGoogleUser(null);
    setSelectedBusiness(null);
    triggerHaptic(25);
  };

  // Permanent Delete Business
  const handleDeleteBusiness = async () => {
    if (!selectedBusiness) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/business?id=${selectedBusiness.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        triggerHaptic(50);
        await handleLogout();
        alert("העסק וכל נתוניו נמחקו לצמיתות מהמערכת.");
      } else {
        const d = await res.json();
        alert(d.error || "שגיאה במחיקת העסק");
      }
    } catch (err) {
      console.error("Error deleting business:", err);
      alert("שגיאת תקשורת במחיקת העסק");
    } finally {
      setIsLoading(false);
    }
  };

  // Business name change in registration form
  const handleRegNameChange = (name: string) => {
    setRegName(name);
    if (!regSlug) {
      setRegSlug(generateRandomSlug(6));
    }
  };

  // Handle New Business Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");

    if (!regName.trim() || !regSlug.trim() || !regPhone.trim()) {
      setRegError("יש למלא את כל שדות החובה המסומנים בכוכבית (*)");
      return;
    }

    const phoneCheck = validatePhoneNumber(regPhone);
    if (!phoneCheck.isValid) {
      setRegError(phoneCheck.error || "מספר טלפון בעל העסק חייב להכיל בדיוק 10 ספרות");
      return;
    }

    if (!googleUser) {
      if (!regPassword.trim()) {
        setRegError("יש להגדיר סיסמה מאובטחת לבעל העסק");
        return;
      }

      if (!passwordValidation.isValid) {
        setRegError("הסיסמה אינה עומדת בכל 5 כללי האבטחה הנדרשים");
        return;
      }
    }

    setIsRegistering(true);
    try {
      const res = await fetch("/api/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName.trim(),
          slug: regSlug.trim(),
          owner_phone: regPhone.trim(),
          owner_email: (googleUser ? googleUser.email : regEmail.trim()) || undefined,
          password: googleUser ? undefined : regPassword.trim(),
          google_id: googleUser ? googleUser.id : undefined,
          slot_interval_minutes: Number(regInterval),
          category: regCategory,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || "שגיאה ביצירת העסק");
        setIsRegistering(false);
        return;
      }

      const biz: Business = data.business;
      setSelectedBusiness(biz);
      setEditingWorkingHours(biz.working_hours);
      setEditingInterval(biz.slot_interval_minutes || 15);
      setEditingOverrides(biz.date_overrides || []);
      localStorage.setItem(ADMIN_SESSION_KEY, biz.slug);
      setIsOnboardingHours(true);
      triggerHaptic(50);
    } catch (err) {
      console.error(err);
      setRegError("שגיאת תקשורת");
    } finally {
      setIsRegistering(false);
    }
  };

  // Load services & appointments for selected business
  const fetchAppointments = useCallback(async () => {
    if (!selectedBusiness) return;
    try {
      const aRes = await fetch(`/api/appointments?business_id=${selectedBusiness.id}`);
      if (aRes.ok) {
        const aList = await aRes.json();
        setAppointments(aList);
      }
      const sRes = await fetch(`/api/services?business_id=${selectedBusiness.id}`);
      if (sRes.ok) {
        const sList = await sRes.json();
        setServices(sList);
        if (sList.length > 0) {
          setWalkinServiceId(sList[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading appointments:", err);
    }
  }, [selectedBusiness]);

  useEffect(() => {
    if (selectedBusiness) {
      fetchAppointments();
    }
  }, [selectedBusiness, fetchAppointments]);

  // Load employees specific to this business (never mock staff for real new businesses!)
  useEffect(() => {
    if (!selectedBusiness) {
      setEmployees([]);
      return;
    }
    const saved = localStorage.getItem(`torli_employees_${selectedBusiness.id}`);
    if (saved) {
      try {
        setEmployees(JSON.parse(saved));
        return;
      } catch {}
    }
    // Only pre-populate if demo business
    if (selectedBusiness.id === "b-barber-1" || selectedBusiness.slug === "barber-dan") {
      setEmployees(DEFAULT_EMPLOYEES.default || []);
    } else {
      setEmployees([]);
    }
  }, [selectedBusiness?.id, selectedBusiness?.slug]);

  // Appointments for the selected day
  const dailyAppointments = useMemo(() => {
    return appointments.filter((app) => {
      const appDate = parseISO(app.start_time);
      return isSameDay(appDate, selectedDate);
    });
  }, [appointments, selectedDate]);

  // Daily Stats KPI
  const dailyStats = useMemo(() => {
    const confirmed = dailyAppointments.filter((a) => a.status === "confirmed");
    const totalIncome = confirmed.reduce(
      (sum, a) => sum + (Number(a.service?.price) || 0),
      0
    );
    return {
      total: dailyAppointments.length,
      confirmed: confirmed.length,
      cancelled: dailyAppointments.filter((a) => a.status === "cancelled").length,
      revenue: totalIncome,
    };
  }, [dailyAppointments]);

  // Appointments count by date
  const appointmentsCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const app of appointments) {
      if (app.status === "confirmed") {
        const d = app.start_time.split("T")[0];
        map[d] = (map[d] || 0) + 1;
      }
    }
    return map;
  }, [appointments]);

  // Month days & weekday alignment for owner view
  const ownerMonthDays = useMemo(() => {
    const start = startOfMonth(ownerMonth);
    const end = endOfMonth(ownerMonth);
    return eachDayOfInterval({ start, end });
  }, [ownerMonth]);

  const ownerStartDayOfWeek = useMemo(() => {
    return getDay(startOfMonth(ownerMonth)); // 0 = Sunday
  }, [ownerMonth]);

  // Check if business works on a given day of the week
  const isBusinessOpenOnDay = useCallback(
    (date: Date) => {
      if (!selectedBusiness) return true;
      const dayIndex = date.getDay();
      const dayNames: DayOfWeek[] = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const dayName = dayNames[dayIndex];
      const cfg = editingWorkingHours?.[dayName] || selectedBusiness.working_hours[dayName];
      return cfg?.active ?? true;
    },
    [selectedBusiness, editingWorkingHours]
  );

  // Get override for date
  const getOverrideForDate = useCallback(
    (date: Date) => {
      const dStr = format(date, "yyyy-MM-dd");
      return editingOverrides.find((o) => o.date === dStr);
    },
    [editingOverrides]
  );

  // Range Closure Presets
  const applyPresetThisWeek = () => {
    const today = new Date();
    const sunday = startOfWeek(today, { weekStartsOn: 0 });
    const thursday = addDays(sunday, 4);
    setRangeStartDate(format(sunday, "yyyy-MM-dd"));
    setRangeEndDate(format(thursday, "yyyy-MM-dd"));
    setRangeReason("חופשה השבוע");
  };

  const applyPresetNextWeek = () => {
    const today = new Date();
    const nextSunday = addDays(startOfWeek(today, { weekStartsOn: 0 }), 7);
    const nextThursday = addDays(nextSunday, 4);
    setRangeStartDate(format(nextSunday, "yyyy-MM-dd"));
    setRangeEndDate(format(nextThursday, "yyyy-MM-dd"));
    setRangeReason("חופשה שבוע הבא");
  };

  const applyPresetWeekend = () => {
    const today = new Date();
    const sunday = startOfWeek(today, { weekStartsOn: 0 });
    const thursday = addDays(sunday, 4);
    const friday = addDays(sunday, 5);
    setRangeStartDate(format(thursday, "yyyy-MM-dd"));
    setRangeEndDate(format(friday, "yyyy-MM-dd"));
    setRangeReason("חופשת סוף שבוע");
  };

  const applyPresetTwoWeeks = () => {
    const today = new Date();
    setRangeStartDate(format(today, "yyyy-MM-dd"));
    setRangeEndDate(format(addDays(today, 13), "yyyy-MM-dd"));
    setRangeReason("חופשה מרוכזת (שבועיים)");
  };

  // Handle closing or opening a range of dates
  const handleRangeAction = async (action: "close" | "open") => {
    if (!selectedBusiness || !rangeStartDate || !rangeEndDate) return;
    try {
      setIsSubmittingRange(true);
      const start = parseISO(rangeStartDate);
      const end = parseISO(rangeEndDate);
      if (start > end) {
        alert("תאריך התחלה חייב להיות לפני תאריך סיום");
        return;
      }

      const days = eachDayOfInterval({ start, end });
      let updatedOverrides = [...editingOverrides];

      if (action === "close") {
        for (const d of days) {
          const dStr = format(d, "yyyy-MM-dd");
          updatedOverrides = updatedOverrides.filter((o) => o.date !== dStr);
          updatedOverrides.push({
            id: "ov-" + Math.random().toString(36).substring(2, 7),
            date: dStr,
            is_closed: true,
            reason: rangeReason.trim() || "חופשה / שבוע סגור",
          });
        }
      } else {
        const dateStrings = new Set(days.map((d) => format(d, "yyyy-MM-dd")));
        updatedOverrides = updatedOverrides.filter((o) => !dateStrings.has(o.date));
      }

      // Persist to backend
      const res = await fetch("/api/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedBusiness.id,
          date_overrides: updatedOverrides,
        }),
      });

      if (res.ok) {
        const savedBiz: Business = await res.json();
        setSelectedBusiness(savedBiz);
        setEditingOverrides(savedBiz.date_overrides || []);
        setIsRangeModalOpen(false);
        setDayActionModalDate(null);
        triggerHaptic(25);
      }
    } catch (err) {
      console.error("Error updating range overrides:", err);
    } finally {
      setIsSubmittingRange(false);
    }
  };

  // Quick single day or 7-day closure from Day Action Modal
  const handleToggleSingleDay = async (date: Date, daysCount = 1) => {
    if (!selectedBusiness) return;
    const existing = getOverrideForDate(date);
    let updatedOverrides = [...editingOverrides];

    if (existing) {
      // Reopen
      const dStr = format(date, "yyyy-MM-dd");
      updatedOverrides = updatedOverrides.filter((o) => o.date !== dStr);
    } else {
      // Close
      for (let i = 0; i < daysCount; i++) {
        const targetD = addDays(date, i);
        const dStr = format(targetD, "yyyy-MM-dd");
        updatedOverrides = updatedOverrides.filter((o) => o.date !== dStr);
        updatedOverrides.push({
          id: "ov-" + Math.random().toString(36).substring(2, 7),
          date: dStr,
          is_closed: true,
          reason: daysCount > 1 ? "שבוע סגור / חופשה" : "חופש / סידורים אישיים",
        });
      }
    }

    try {
      const res = await fetch("/api/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedBusiness.id,
          date_overrides: updatedOverrides,
        }),
      });
      if (res.ok) {
        const savedBiz: Business = await res.json();
        setSelectedBusiness(savedBiz);
        setEditingOverrides(savedBiz.date_overrides || []);
        setDayActionModalDate(null);
        triggerHaptic(20);
      }
    } catch (err) {
      console.error("Error toggling day override:", err);
    }
  };

  // Cancel appointment handler
  const handleCancelAppointment = async (id: string) => {
    if (!confirm("האם לבטל את התור? המועד ישתחרר מיד ללקוחות אחרים.")) return;
    triggerHaptic(25);

    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (res.ok) {
        fetchAppointments();
      }
    } catch (err) {
      console.error("Cancel error:", err);
    }
  };

  // Quick Add Walk-in submit
  const handleWalkinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness || !walkinServiceId) return;

    setIsSubmittingWalkin(true);
    triggerHaptic(20);

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const startIso = new Date(`${dateStr}T${walkinTime}:00`).toISOString();

    let finalPhone = "0500000000";
    if (walkinPhone.trim()) {
      const phoneCheck = validatePhoneNumber(walkinPhone);
      if (!phoneCheck.isValid) {
        alert(phoneCheck.error || "מספר טלפון לקוח לא תקין (חייב להכיל 10 ספרות בדיוק)");
        setIsSubmittingWalkin(false);
        return;
      }
      finalPhone = phoneCheck.cleaned;
    }

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: selectedBusiness.id,
          service_id: walkinServiceId,
          phone: finalPhone,
          first_name: walkinFirstName.trim() || "לקוח",
          last_name: walkinLastName.trim() || "מזדמן",
          start_time: startIso,
          notes: "נוסף ידנית ע״י בית העסק",
        }),
      });

      if (res.ok) {
        setIsQuickAddOpen(false);
        setWalkinFirstName("");
        setWalkinLastName("");
        setWalkinPhone("");
        fetchAppointments();
      } else {
        const data = await res.json();
        alert(data.error || "שגיאה בהוספת התור");
      }
    } catch (err) {
      console.error(err);
      alert("שגיאה ברשת");
    } finally {
      setIsSubmittingWalkin(false);
    }
  };

  // Block Time submit (one-off)
  const handleBlockTimeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness) return;

    setIsSubmittingBlock(true);
    triggerHaptic(25);

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const startIso = new Date(`${dateStr}T${blockStartTime}:00`).toISOString();
    const endIso = new Date(`${dateStr}T${blockEndTime}:00`).toISOString();

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_block: true,
          business_id: selectedBusiness.id,
          start_time: startIso,
          end_time: endIso,
          reason: blockReason,
        }),
      });

      if (res.ok) {
        setIsBlockTimeOpen(false);
        fetchAppointments();
      } else {
        const data = await res.json();
        alert(data.error || "שגיאה בחסימת זמן");
      }
    } catch (err) {
      console.error(err);
      alert("שגיאה ברשת");
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  // Test WhatsApp Reminder Cron Trigger
  const handleTriggerReminderCron = async () => {
    setIsReminderRunning(true);
    setReminderResult(null);
    triggerHaptic(30);

    try {
      const res = await fetch("/api/cron/reminders?secret=schedule-cron-secret-key-123");
      const data = await res.json();
      setReminderResult(data);
      fetchAppointments();
    } catch (err) {
      console.error(err);
      alert("שגיאה בהפעלת מנגנון התזכורות");
    } finally {
      setIsReminderRunning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-500">טוען לוח ניהול מאובטח...</p>
      </div>
    );
  }

  // =========================================================================
  // PRIVATE AUTHENTICATION GATEWAY: NO PUBLIC DIRECTORY SHOWN
  // =========================================================================
  if (!selectedBusiness) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full space-y-6">
          {/* SaaS Branding Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-3xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              כניסה פרטית לבעלי עסקים
            </h1>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              התחבר לחשבון העסק שלך באופן פרטי ומאובטח או פתח חשבון עסק חדש
            </p>
          </div>

          {/* Tab Switcher: Login / Register */}
          <div className="flex bg-slate-200 p-1 rounded-2xl">
            <button
              onClick={() => {
                setAuthTab("login");
                setLoginError("");
              }}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all",
                authTab === "login"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              התחברות לעסק שלי
            </button>
            <button
              onClick={() => {
                setAuthTab("register");
                setRegError("");
              }}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all",
                authTab === "register"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              הרשמת עסק חדש 🚀
            </button>
          </div>

          {/* TAB 1: PRIVATE LOGIN */}
          {authTab === "login" && (
            <Card className="p-6 space-y-4">
              <div className="text-right">
                <h3 className="font-bold text-sm text-slate-900">
                  הזן פרטי זיהוי לכניסה:
                </h3>
                <p className="text-xs text-slate-500">
                  התחברות באמצעות חשבון Google או מספר טלפון וסיסמה
                </p>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2 text-right">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* 1-Tap Google Sign-In for Owner */}
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleGoogleOwnerLogin}
                isLoading={isLoggingIn}
                className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 border-slate-300 text-slate-700 font-bold shadow-xs py-3"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>התחבר באמצעות Google</span>
              </Button>

              <div className="relative flex py-1 items-center justify-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-slate-400 text-xs font-medium">או התחבר עם טלפון וסיסמה</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4 text-right">
                <Input
                  label="מספר טלפון נייד *"
                  type="tel"
                  placeholder="054-1234567"
                  dir="ltr"
                  className="text-right font-medium text-base"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  required
                />

                <Input
                  label="סיסמה אישית *"
                  type="password"
                  placeholder="הזן סיסמה מאובטחת"
                  dir="ltr"
                  className="text-right font-medium text-base"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  helperText="הזן את הסיסמה האישית שהוגדרה בעת הרישום"
                  required
                />

                <Button
                  type="submit"
                  size="lg"
                  isLoading={isLoggingIn}
                  className="w-full mt-2 shadow-md shadow-indigo-600/20"
                >
                  <KeyRound className="w-4 h-4 ml-2" />
                  <span>התחבר ליומן שלי</span>
                </Button>
              </form>

              {/* Quick demo helper banner */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-1 text-right">
                <span className="font-bold text-slate-700 block">עסקי הדגמה מוכנים מראש:</span>
                <div>• מספרת דניאל: טלפון <span className="font-mono font-bold text-slate-800">0541234567</span> | סיסמה: <span className="font-mono font-bold text-slate-800">BarberDan2026!</span></div>
                <div>• סטודיו מיה: טלפון <span className="font-mono font-bold text-slate-800">0529876543</span> | סיסמה: <span className="font-mono font-bold text-slate-800">MayaNails2026!</span></div>
                <div>• קליניקת רפאל: טלפון <span className="font-mono font-bold text-slate-800">0505556677</span> | סיסמה: <span className="font-mono font-bold text-slate-800">RafaelClinic2026!</span></div>
              </div>
            </Card>
          )}

          {/* TAB 2: REGISTER NEW BUSINESS */}
          {authTab === "register" && (
            <Card className="p-6 space-y-4">
              <div className="text-right">
                <h3 className="font-bold text-sm text-slate-900">
                  פתיחת חשבון עסק חדש
                </h3>
                <p className="text-xs text-slate-500">
                  קבל יומן תורים מותאם אישית תוך 30 שניות
                </p>
              </div>

              {regError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2 text-right">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              {/* 1-Tap Google Registration / Connected Status */}
              {googleUser ? (
                <div className="p-4 rounded-2xl bg-gradient-to-l from-emerald-50 to-teal-50 border border-emerald-200 text-right space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                        <Check className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-emerald-950 block">מחובר באמצעות Google</span>
                        <span className="text-xs text-emerald-700 font-mono">{googleUser.email}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (supabase) await supabase.auth.signOut();
                        setGoogleUser(null);
                        setLoginError("");
                      }}
                      className="text-xs text-emerald-800 hover:text-emerald-950 font-bold underline px-2 py-1 rounded hover:bg-emerald-100/60 transition-colors"
                    >
                      החלף חשבון
                    </button>
                  </div>
                  <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                    חשבון Google אומת בהצלחה! נשאר רק לתת שם לעסק ומספר טלפון כדי לפתוח את היומן שלך מיד (ללא צורך בסיסמה).
                  </p>
                </div>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={handleGoogleOwnerLogin}
                    isLoading={isLoggingIn}
                    className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 border-slate-300 text-slate-700 font-bold shadow-xs py-3"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                    <span>הרשמה מהירה באמצעות Google</span>
                  </Button>

                  <div className="relative flex py-1 items-center justify-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-3 text-slate-400 text-xs font-medium">או מלא את פרטי העסק והסיסמה</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>
                </>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-right">
                <Input
                  label="שם בית העסק *"
                  placeholder="לדוגמה: מספרת אלירן, סטודיו זוהר"
                  value={regName}
                  onChange={(e) => handleRegNameChange(e.target.value)}
                  required
                />

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-semibold text-slate-700">
                      סיומת קישור אישית (6 אותיות רנדומליות) *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(15);
                        setRegSlug(generateRandomSlug(6));
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 transition-colors"
                    >
                      <Dices className="w-3.5 h-3.5" />
                      <span>הגרל סלאג חדש</span>
                    </button>
                  </div>
                  <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-3 h-12 ltr focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all">
                    <span className="text-xs text-slate-400 font-mono">torli.app/</span>
                    <input
                      type="text"
                      value={regSlug}
                      onChange={(e) =>
                        setRegSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]/g, "")
                            .slice(0, 12)
                        )
                      }
                      placeholder="kx9m2p"
                      className="w-full bg-transparent border-none text-sm font-bold text-indigo-600 focus:outline-none pl-1"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 text-right">
                    כתובת מקוצרת וקלה לשיתוף (למשל torli-eight.vercel.app/{regSlug || "kx9m2p"})
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="טלפון נייד בעל העסק (10 ספרות) *"
                    type="tel"
                    maxLength={12}
                    placeholder="054-0001122"
                    dir="ltr"
                    className="text-right font-medium"
                    value={regPhone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                      let formatted = digits;
                      if (digits.length > 3) {
                        formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
                      }
                      setRegPhone(formatted);
                    }}
                    helperText={
                      regPhone.replace(/\D/g, "").length === 10
                        ? "✓ 10 ספרות תקינות"
                        : regPhone.replace(/\D/g, "").length > 0
                        ? `חסרות ספרות (${regPhone.replace(/\D/g, "").length}/10)`
                        : undefined
                    }
                    required
                  />
                  <Input
                    label="כתובת אימייל"
                    type="email"
                    placeholder="owner@example.com"
                    dir="ltr"
                    value={googleUser ? googleUser.email : regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    disabled={!!googleUser}
                  />
                </div>

                {/* Password field or Google Security Confirmation */}
                {!googleUser ? (
                  <div className="space-y-1.5">
                    <Input
                      label="סיסמה מאובטחת לבעל העסק *"
                      type="password"
                      placeholder="לדוגמה: Barber2026!"
                      dir="ltr"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                    />

                    {/* Real-Time Visual Security Checklist */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1.5 text-right">
                      <span className="font-bold text-slate-700 block text-[11px]">
                        כללי אבטחה לסיסמה:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                        <div className={cn("flex items-center gap-1.5 transition-colors", passwordValidation.hasMinLength ? "text-emerald-700 font-bold" : "text-slate-500")}>
                          <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[10px]", passwordValidation.hasMinLength ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400")}>
                            {passwordValidation.hasMinLength ? <Check className="w-3 h-3" /> : "•"}
                          </div>
                          <span>לפחות 8 תווים</span>
                        </div>

                        <div className={cn("flex items-center gap-1.5 transition-colors", passwordValidation.hasUpper ? "text-emerald-700 font-bold" : "text-slate-500")}>
                          <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[10px]", passwordValidation.hasUpper ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400")}>
                            {passwordValidation.hasUpper ? <Check className="w-3 h-3" /> : "•"}
                          </div>
                          <span>אות גדולה באנגלית (A-Z)</span>
                        </div>

                        <div className={cn("flex items-center gap-1.5 transition-colors", passwordValidation.hasLower ? "text-emerald-700 font-bold" : "text-slate-500")}>
                          <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[10px]", passwordValidation.hasLower ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400")}>
                            {passwordValidation.hasLower ? <Check className="w-3 h-3" /> : "•"}
                          </div>
                          <span>אות קטנה באנגלית (a-z)</span>
                        </div>

                        <div className={cn("flex items-center gap-1.5 transition-colors", passwordValidation.hasNumber ? "text-emerald-700 font-bold" : "text-slate-500")}>
                          <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[10px]", passwordValidation.hasNumber ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400")}>
                            {passwordValidation.hasNumber ? <Check className="w-3 h-3" /> : "•"}
                          </div>
                          <span>ספרה (0-9)</span>
                        </div>

                        <div className={cn("flex items-center gap-1.5 transition-colors sm:col-span-2", passwordValidation.hasSpecial ? "text-emerald-700 font-bold" : "text-slate-500")}>
                          <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[10px]", passwordValidation.hasSpecial ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400")}>
                            {passwordValidation.hasSpecial ? <Check className="w-3 h-3" /> : "•"}
                          </div>
                          <span>{"תו מיוחד (!@#$%^&*()_+-=[]{};':\"|,.<>/?) "}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2.5 text-right">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-[10px]">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span>חשבונך מאובטח אוטומטית באמצעות Google — אין צורך ביצירת סיסמה נוספת.</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    תחום פעילות העסק
                  </label>
                  <select
                    value={regCategory}
                    onChange={(e) => setRegCategory(e.target.value as any)}
                    className="w-full h-12 rounded-2xl border border-slate-200 px-3 text-sm bg-white font-medium"
                  >
                    <option value="barber">מספרה / עיצוב שיער לגברים ונשים</option>
                    <option value="nails">סטודיו ציפורניים / מניקור / יופי</option>
                    <option value="therapy">קליניקה / עיסויים / פיזיותרפיה</option>
                    <option value="general">כללי / שירותים אחרים</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    רזולוציית תורים רצויה (מרווח זימון בין תורים)
                  </label>
                  <select
                    value={regInterval}
                    onChange={(e) => setRegInterval(e.target.value)}
                    className="w-full h-12 rounded-2xl border border-slate-200 px-3 text-sm bg-white font-medium"
                  >
                    <option value="15">כל 15 דקות (09:00, 09:15, 09:30...)</option>
                    <option value="20">כל 20 דקות (09:00, 09:20, 09:40, 10:00...)</option>
                    <option value="30">כל 30 דקות (09:00, 09:30, 10:00...)</option>
                    <option value="45">כל 45 דקות (09:00, 09:45, 10:30...)</option>
                    <option value="60">כל 60 דקות (תורים עגולים בכל שעה עגולה)</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  isLoading={isRegistering}
                  disabled={!googleUser && regPassword.length > 0 && !passwordValidation.isValid}
                  className="w-full mt-2 shadow-md shadow-indigo-600/20"
                >
                  <Sparkles className="w-4 h-4 ml-2" />
                  <span>
                    {googleUser
                      ? "המשך להגדרת שעות פעילות 🚀"
                      : "המשך להגדרת שעות פעילות"}
                  </span>
                </Button>
              </form>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // ONBOARDING STEP 2: SET OPERATING HOURS
  // =========================================================================
  if (isOnboardingHours && selectedBusiness) {
    const dayLabels: Record<DayOfWeek, string> = {
      sunday: "יום ראשון",
      monday: "יום שני",
      tuesday: "יום שלישי",
      wednesday: "יום רביעי",
      thursday: "יום חמישי",
      friday: "יום שישי",
      saturday: "יום שבת",
    };

    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4">
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 px-3.5 py-1 rounded-full text-xs font-black shadow-2xs">
              <span>שלב 2 מתוך 2</span>
              <span>•</span>
              <span>הגדרת שעות פתיחה לעסק</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              ברוך הבא ל-Torli, {selectedBusiness.name}! 🎉
            </h1>
            <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
              העסק נוצר בהצלחה! כעת בחר באילו ימים ושעות העסק שלך יהיה פתוח לקבלת תורים מלקוחות.
            </p>
          </div>

          {/* Weekly Schedule Card */}
          <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-3xl space-y-5 text-right">
            {/* Preset shortcuts */}
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500">תבניות מהירות:</span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setEditingWorkingHours({
                    sunday: { active: true, open: "09:00", close: "19:00", lunch_break: { active: true, start: "13:00", end: "14:00" } },
                    monday: { active: true, open: "09:00", close: "19:00", lunch_break: { active: true, start: "13:00", end: "14:00" } },
                    tuesday: { active: true, open: "09:00", close: "19:00", lunch_break: { active: true, start: "13:00", end: "14:00" } },
                    wednesday: { active: true, open: "09:00", close: "19:00", lunch_break: { active: true, start: "13:00", end: "14:00" } },
                    thursday: { active: true, open: "09:00", close: "20:00", lunch_break: { active: true, start: "13:00", end: "14:00" } },
                    friday: { active: true, open: "08:30", close: "14:00", lunch_break: { active: false, start: "12:00", end: "12:30" } },
                    saturday: { active: false, open: "00:00", close: "00:00" },
                  });
                }}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 transition-colors"
              >
                שבוע סטנדרטי (א׳-ה׳ 09:00-19:00, ו׳ עד 14:00)
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setEditingWorkingHours({
                    sunday: { active: true, open: "10:00", close: "20:00" },
                    monday: { active: true, open: "10:00", close: "20:00" },
                    tuesday: { active: true, open: "10:00", close: "20:00" },
                    wednesday: { active: true, open: "10:00", close: "20:00" },
                    thursday: { active: true, open: "10:00", close: "20:00" },
                    friday: { active: false, open: "00:00", close: "00:00" },
                    saturday: { active: false, open: "00:00", close: "00:00" },
                  });
                }}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 transition-colors"
              >
                ימי חול בלבד (א׳-ה׳ 10:00-20:00)
              </button>
            </div>

            {/* Days list */}
            <div className="space-y-3">
              {(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as DayOfWeek[]).map((day) => {
                const cfg = editingWorkingHours?.[day] || { active: true, open: "09:00", close: "19:00" };

                return (
                  <div
                    key={day}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
                      cfg.active ? "bg-white border-slate-200 shadow-2xs" : "bg-slate-50/80 border-slate-200/60 opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={cfg.active}
                        onChange={(e) => {
                          setEditingWorkingHours((prev) => {
                            const base = prev || (selectedBusiness?.working_hours as WorkingHours);
                            return {
                              ...base,
                              [day]: { ...cfg, active: e.target.checked },
                            };
                          });
                        }}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-bold text-slate-800 w-24">
                        {dayLabels[day]}
                      </span>
                      {!cfg.active && (
                        <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                          סגור ביום זה
                        </span>
                      )}
                    </div>

                    {cfg.active && (
                      <div className="flex flex-wrap items-center gap-2.5 text-xs">
                        <span className="text-slate-400 font-medium">פתיחה:</span>
                        <input
                          type="time"
                          value={cfg.open}
                          onChange={(e) => {
                            setEditingWorkingHours((prev) => {
                              const base = prev || (selectedBusiness?.working_hours as WorkingHours);
                              return {
                                ...base,
                                [day]: { ...cfg, open: e.target.value },
                              };
                            });
                          }}
                          className="border border-slate-200 rounded-xl px-2.5 py-1 text-slate-800 font-bold bg-white"
                        />
                        <span className="text-slate-400 font-medium">סגירה:</span>
                        <input
                          type="time"
                          value={cfg.close}
                          onChange={(e) => {
                            setEditingWorkingHours((prev) => {
                              const base = prev || (selectedBusiness?.working_hours as WorkingHours);
                              return {
                                ...base,
                                [day]: { ...cfg, close: e.target.value },
                              };
                            });
                          }}
                          className="border border-slate-200 rounded-xl px-2.5 py-1 text-slate-800 font-bold bg-white"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                השעות יישמרו ותוכל לעדכן אותן תמיד דרך אזור &quot;שעות פעילות&quot;.
              </span>
              <Button
                type="button"
                size="lg"
                isLoading={isSavingOnboardingHours}
                onClick={async () => {
                  triggerHaptic(40);
                  setIsSavingOnboardingHours(true);
                  try {
                    const res = await fetch("/api/business", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        id: selectedBusiness.id,
                        working_hours: editingWorkingHours,
                      }),
                    });
                    if (res.ok) {
                      const updated = await res.json();
                      setSelectedBusiness(updated);
                    }
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setIsSavingOnboardingHours(false);
                    setIsOnboardingHours(false);
                    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
                  }
                }}
                className="w-full sm:w-auto shadow-lg shadow-indigo-600/25 px-8"
              >
                <Sparkles className="w-4 h-4 ml-2" />
                <span>שמור שעות והיכנס ליומן 🚀</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // =========================================================================
  // AUTHENTICATED: SCOPED PRIVATE DASHBOARD
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pb-24">
      {/* SaaS 11-Destination Top Navigation Bar */}
      <AdminTopBar
        business={selectedBusiness}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 space-y-4">
        {/* ========================================================================= */}
        {/* TAB 1: CALENDAR VIEW */}
        {/* ========================================================================= */}
        {activeTab === "calendar" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Staff Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap ml-1">סינון לפי עובד:</span>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(10);
                    setSelectedStaffId("all");
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                    selectedStaffId === "all"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  כל הצוות ({employees.length})
                </button>
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic(10);
                      setSelectedStaffId(emp.id);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap",
                      selectedStaffId === emp.id
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    <span>{emp.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>

              <div className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 text-right whitespace-nowrap">
                <span>{dailyAppointments.length} תורים נקבעו ליום זה</span>
              </div>
            </div>
            {/* Schedule View Segment Control */}
            <div className="flex bg-slate-200/85 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  setScheduleMode("day");
                }}
                className={cn(
                  "flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                  scheduleMode === "day"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>יומן יומי ({format(selectedDate, "dd/MM")})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  setScheduleMode("month");
                }}
                className={cn(
                  "flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                  scheduleMode === "month"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>לוח חודשי וסגירת יום/שבוע</span>
              </button>
            </div>

            {/* SUB-VIEW 1: DETAILED DAILY SCHEDULE */}
            {scheduleMode === "day" && (
              <div className="space-y-4">
                {/* Date Navigator Bar */}
                <Card className="p-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedDate((d) => addDays(d, 1))}
                  className="p-2 rounded-xl hover:bg-slate-100 active:bg-slate-200 text-slate-600"
                  title="יום הבא"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <div className="text-center">
                  <div className="text-base font-bold text-slate-900">
                    {formatHebrewDate(selectedDate)}
                  </div>
                  {selectedBusiness?.settings?.show_hebrew_dates && (
                    <div className="text-xs text-indigo-600 font-bold mt-0.5 flex items-center justify-center gap-1.5">
                      <span>{formatJewishDate(selectedDate, true)}</span>
                      {getJewishHolidayOrShabbat(selectedDate) && (
                        <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md border border-indigo-200/60 text-[10px]">
                          {getJewishHolidayOrShabbat(selectedDate)}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-0.5">
                    {isSameDay(selectedDate, startOfToday()) ? (
                      <span className="text-emerald-600 font-semibold">היום</span>
                    ) : (
                      <button
                        onClick={() => setSelectedDate(startOfToday())}
                        className="text-indigo-600 hover:underline"
                      >
                        קפוץ להיום
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedDate((d) => subDays(d, 1))}
                  className="p-2 rounded-xl hover:bg-slate-100 active:bg-slate-200 text-slate-600"
                  title="יום קודם"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            </Card>

            {/* Daily KPI Stats Bar */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-white rounded-2xl p-3 border border-slate-200/80 text-center shadow-soft">
                <span className="text-xs text-slate-400 block font-medium">
                  תורים מאושרים
                </span>
                <span className="text-xl font-extrabold text-indigo-600">
                  {dailyStats.confirmed}
                </span>
              </div>
              <div className="bg-white rounded-2xl p-3 border border-slate-200/80 text-center shadow-soft">
                <span className="text-xs text-slate-400 block font-medium">בוטלו</span>
                <span className="text-xl font-extrabold text-rose-500">
                  {dailyStats.cancelled}
                </span>
              </div>
              <div className="bg-white rounded-2xl p-3 border border-slate-200/80 text-center shadow-soft">
                <span className="text-xs text-slate-400 block font-medium">
                  הכנסה משוערת
                </span>
                <span className="text-xl font-extrabold text-emerald-600">
                  ₪{dailyStats.revenue}
                </span>
              </div>
            </div>

            {/* Quick Action Buttons for One-Thumb Reach */}
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="primary"
                onClick={() => setIsQuickAddOpen(true)}
                className="h-12 rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4 ml-1.5" />
                <span>הוסף לקוח / תור ידני</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsBlockTimeOpen(true)}
                className="h-12 rounded-2xl text-xs sm:text-sm font-bold text-amber-700 border-amber-300 bg-amber-50/50 hover:bg-amber-100/50"
              >
                <Ban className="w-4 h-4 ml-1.5 text-amber-600" />
                <span>חסימת זמן חד-פעמית</span>
              </Button>
            </div>

            {/* Vertical Daily Timeline List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>לוח זמנים ({dailyAppointments.length} תורים)</span>
                <button
                  onClick={fetchAppointments}
                  className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>רענן</span>
                </button>
              </div>

              {dailyAppointments.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                  <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="font-bold text-slate-800 mb-1">אין תורים ביום זה</h4>
                  <p className="text-xs text-slate-500">
                    יומן פנוי לקבלת לקוחות או לחסימת שעות
                  </p>
                </div>
              ) : (
                dailyAppointments.map((app) => {
                  const isCancelled = app.status === "cancelled";
                  const isBlockedSlot = app.notes?.includes("[זמן חסום]");
                  const clientPhone = app.client?.phone || "";
                  const clientName = `${app.client?.first_name || ""} ${
                    app.client?.last_name || ""
                  }`.trim();

                  const waGreeting = encodeURIComponent(
                    `היי ${app.client?.first_name || "חבר"}, תזכורת לתור שלך ל${
                      app.service?.name || "טיפול"
                    } היום בשעה ${formatTime(app.start_time)} ב${
                      selectedBusiness.name
                    }! נשמח לראותך 🙂`
                  );

                  return (
                    <div
                      key={app.id}
                      className={cn(
                        "rounded-2xl border p-4 bg-white transition-all shadow-soft",
                        isCancelled
                          ? "opacity-60 bg-slate-50 border-slate-200"
                          : isBlockedSlot
                          ? "border-amber-200 bg-amber-50/40"
                          : "border-slate-200/90"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Right: Client & Service Details */}
                        <div className="text-right flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-base text-slate-900">
                              {clientName || "לקוח ללא שם"}
                            </span>
                            {isCancelled ? (
                              <Badge variant="destructive">בוטל</Badge>
                            ) : isBlockedSlot ? (
                              <Badge variant="warning">זמן חסום</Badge>
                            ) : (
                              <Badge variant="success">מאושר</Badge>
                            )}
                          </div>

                          <div className="text-xs font-semibold text-indigo-600 mt-0.5">
                            {app.service?.name || "שירות כללי"}
                            {app.service?.price ? ` • ₪${app.service.price}` : ""}
                          </div>

                          {app.notes && (
                            <p className="text-xs text-slate-500 mt-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              {app.notes}
                            </p>
                          )}
                        </div>

                        {/* Left: Time badge */}
                        <div className="text-left flex-shrink-0">
                          <div className="px-3 py-1.5 bg-slate-100 rounded-xl text-center">
                            <span className="text-sm font-extrabold text-slate-900 block leading-none">
                              {formatTime(app.start_time)}
                            </span>
                            <span className="text-[11px] text-slate-500 leading-tight">
                              עד {formatTime(app.end_time)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Direct Action Buttons: "חייג" & "וואטסאפ" */}
                      {!isBlockedSlot && !isCancelled && clientPhone && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                          <a
                            href={`tel:${clientPhone}`}
                            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs hover:bg-slate-200 active:bg-slate-300 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-indigo-600" />
                            <span>חייג ({formatPhone(clientPhone)})</span>
                          </a>

                          <a
                            href={`https://wa.me/${toInternationalPhone(
                              clientPhone
                            )}?text=${waGreeting}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 hover:bg-emerald-100 active:bg-emerald-200 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>וואטסאפ</span>
                          </a>

                          <button
                            onClick={() => handleCancelAppointment(app.id)}
                            className="h-10 px-3 rounded-xl bg-rose-50 text-rose-600 font-bold text-xs hover:bg-rose-100 transition-colors"
                            title="בטל תור"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {(isCancelled || isBlockedSlot) && (
                        <div className="flex justify-end mt-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => handleCancelAppointment(app.id)}
                            className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>הסר מהלוח</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            </div>
            )}

            {/* SUB-VIEW 2: FULL MONTH CALENDAR & FAST CLOSURES */}
            {scheduleMode === "month" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <Card className="p-4 sm:p-5 space-y-4">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() => setOwnerMonth((m) => subMonths(m, 1))}
                      className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center"
                      title="חודש קודם"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>

                    <div className="text-center">
                      <span className="text-base sm:text-lg font-extrabold text-slate-900 capitalize">
                        {format(ownerMonth, "MMMM yyyy", { locale: he })}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOwnerMonth((m) => addMonths(m, 1))}
                      className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center"
                      title="חודש הבא"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Range Closure Action Banner */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200 text-right">
                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <Palmtree className="w-5 h-5 text-rose-600 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-rose-950">
                          סגירת שבוע שלם או חופשה מרוכזת
                        </div>
                        <div className="text-[11px] text-rose-700">
                          חסום שבוע או טווח ימים שלם בלחיצה אחת, בלי לעבור יום-יום
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        applyPresetNextWeek();
                        setIsRangeModalOpen(true);
                      }}
                      className="w-full sm:w-auto text-xs font-bold whitespace-nowrap shadow-sm"
                    >
                      <CalendarX className="w-3.5 h-3.5 ml-1" />
                      <span>סגור שבוע / חופשה</span>
                    </Button>
                  </div>

                  {/* Weekday Column Headers */}
                  <div className="grid grid-cols-7 gap-1 text-center select-none pt-1">
                    {["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"].map((dayName, idx) => (
                      <div key={idx} className="text-xs font-bold text-slate-400 py-1">
                        {dayName}
                      </div>
                    ))}
                  </div>

                  {/* Month Grid */}
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center items-stretch">
                    {Array.from({ length: ownerStartDayOfWeek }).map((_, i) => (
                      <div key={`owner-pad-${i}`} className="min-h-16" />
                    ))}

                    {ownerMonthDays.map((day, idx) => {
                      const dStr = format(day, "yyyy-MM-dd");
                      const dayNum = format(day, "d");
                      const isTodayDate = isSameDay(day, startOfToday());
                      const isSelected = isSameDay(day, selectedDate);
                      const isPastDate = isBefore(day, startOfToday());
                      const override = getOverrideForDate(day);
                      const isWeeklyOpen = isBusinessOpenOnDay(day);
                      const appCount = appointmentsCountByDate[dStr] || 0;
                      const isOverrideClosed = override?.is_closed ?? false;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setDayActionModalDate(day)}
                          className={cn(
                            "min-h-16 p-1.5 rounded-2xl border flex flex-col justify-between items-center transition-all relative group text-right",
                            isPastDate
                              ? "bg-slate-100/75 border-slate-200 text-slate-500 hover:bg-slate-200/60 hover:border-slate-300"
                              : isOverrideClosed
                              ? "bg-rose-50 border-rose-200 hover:border-rose-400"
                              : !isWeeklyOpen
                              ? "bg-slate-50 border-slate-200/80 opacity-60"
                              : "bg-white border-slate-200 hover:border-indigo-400 hover:shadow-xs",
                            isTodayDate && "ring-2 ring-indigo-500/50",
                            isSelected && "ring-2 ring-indigo-600"
                          )}
                          title={`לחץ לניהול יום ${formatHebrewDate(day)}`}
                        >
                          <div className="flex items-center justify-between w-full px-0.5">
                            <span
                              className={cn(
                                "text-xs font-bold",
                                isPastDate
                                  ? "text-slate-500 font-semibold"
                                  : isOverrideClosed
                                  ? "text-rose-950 font-extrabold"
                                  : isTodayDate
                                  ? "text-indigo-600 font-extrabold"
                                  : "text-slate-800"
                              )}
                            >
                              {dayNum}
                            </span>
                            {selectedBusiness?.settings?.show_hebrew_dates && (
                              <span className="text-[10px] text-slate-500 font-bold truncate max-w-[44px]">
                                {getHebrewDayLetter(day)}
                              </span>
                            )}
                            {isTodayDate && (
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                            )}
                          </div>

                          {selectedBusiness?.settings?.show_hebrew_dates && getJewishHolidayOrShabbat(day) && (
                            <div className="w-full text-center px-0.5 mt-0.5">
                              <span className="text-[9px] font-semibold text-amber-800 bg-amber-50/90 border border-amber-200/70 px-1 py-0.5 rounded block truncate">
                                {getJewishHolidayOrShabbat(day)}
                              </span>
                            </div>
                          )}

                          <div className="w-full text-center my-auto">
                            {isPastDate ? (
                              appCount > 0 ? (
                                <span className="text-[10px] font-bold text-slate-700 bg-slate-200/80 border border-slate-300/80 px-1 py-0.5 rounded-md block truncate">
                                  {appCount} שהיו
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 block font-normal">
                                  עבר
                                </span>
                              )
                            ) : isOverrideClosed ? (
                              <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100/90 px-1 py-0.5 rounded-md block truncate">
                                {override?.reason || "סגור"}
                              </span>
                            ) : !isWeeklyOpen ? (
                              <span className="text-[10px] text-slate-400 block font-medium">
                                סגור קבוע
                              </span>
                            ) : appCount > 0 ? (
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1 py-0.5 rounded-md block">
                                {appCount} תורים
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-600 font-medium block">
                                פתוח
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-md bg-white border border-slate-300" />
                      <span>יום עבודה</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-md bg-rose-100 border border-rose-300" />
                      <span className="font-bold text-rose-700">חופשה / סגור</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-md bg-indigo-100 border border-indigo-300" />
                      <span className="text-indigo-700 font-semibold">יש תורים</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-md bg-slate-200 border border-slate-300" />
                      <span className="text-slate-600 font-medium">עבר (לחיץ לצפייה)</span>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: STATS */}
        {/* ========================================================================= */}
        {activeTab === "stats" && (
          <div className="animate-in fade-in duration-200">
            <StatsSection
              appointments={appointments}
              services={services}
              clients={clients}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CUSTOMERS & CRM */}
        {/* ========================================================================= */}
        {activeTab === "customers" && (
          <div className="animate-in fade-in duration-200">
            <CustomersSection
              clients={clients}
              appointments={appointments}
              services={services}
              businessId={selectedBusiness.id}
              onAddClient={(newClient) => {
                setCustomClients((prev) => [newClient as Client, ...prev]);
              }}
              onUpdateClientNotes={(clientId, notes) => {
                setCustomClients((prev) => {
                  const exists = prev.find((c) => c.id === clientId);
                  if (exists) {
                    return prev.map((c) => (c.id === clientId ? { ...c, notes } : c));
                  }
                  const clientObj = clients.find((c) => c.id === clientId);
                  if (clientObj) {
                    return [...prev, { ...clientObj, notes }];
                  }
                  return prev;
                });
                setAppointments((prev) =>
                  prev.map((a) =>
                    a.client_id === clientId && a.client
                      ? { ...a, client: { ...a.client, notes } }
                      : a
                  )
                );
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SERVICES & PRICING */}
        {/* ========================================================================= */}
        {activeTab === "services" && (
          <div className="animate-in fade-in duration-200">
            <ServicesSection
              services={services}
              businessId={selectedBusiness.id}
              onAddService={async (service) => {
                await fetch("/api/services", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(service),
                });
                fetchAppointments();
              }}
              onEditService={async (service) => {
                await fetch("/api/services", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(service),
                });
                fetchAppointments();
              }}
              onDeleteService={async (serviceId) => {
                try {
                  await fetch(`/api/services?id=${serviceId}`, { method: "DELETE" });
                  fetchAppointments();
                } catch (err) {
                  console.error(err);
                }
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: WORK SCHEDULE & ATTENDANCE */}
        {/* ========================================================================= */}
        {activeTab === "workschedule" && (
          <div className="animate-in fade-in duration-200">
            <WorkScheduleSection
              business={selectedBusiness}
              workingHours={editingWorkingHours || selectedBusiness.working_hours}
              onUpdateWorkingHours={async (hours) => {
                setEditingWorkingHours(hours);
                await fetch("/api/business", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: selectedBusiness.id,
                    working_hours: hours,
                  }),
                });
              }}
              dateOverrides={editingOverrides}
              onAddOverride={async (ovr) => {
                const updated = [...editingOverrides, ovr];
                setEditingOverrides(updated);
                await fetch("/api/business", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: selectedBusiness.id,
                    date_overrides: updated,
                  }),
                });
              }}
              onDeleteOverride={async (ovrId) => {
                const updated = editingOverrides.filter((o) => o.id !== ovrId);
                setEditingOverrides(updated);
                await fetch("/api/business", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: selectedBusiness.id,
                    date_overrides: updated,
                  }),
                });
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: EMPLOYEES */}
        {/* ========================================================================= */}
        {activeTab === "employees" && (
          <div className="animate-in fade-in duration-200">
            <EmployeesSection
              employees={employees}
              services={services}
              businessId={selectedBusiness.id}
              onAddEmployee={(newEmp) => {
                setEmployees((prev) => {
                  const updated = [newEmp as Employee, ...prev];
                  if (selectedBusiness) {
                    localStorage.setItem(`torli_employees_${selectedBusiness.id}`, JSON.stringify(updated));
                  }
                  return updated;
                });
              }}
              onToggleVisibility={(empId) => {
                setEmployees((prev) => {
                  const updated = prev.map((e) =>
                    e.id === empId ? { ...e, is_visible_online: !e.is_visible_online } : e
                  );
                  if (selectedBusiness) {
                    localStorage.setItem(`torli_employees_${selectedBusiness.id}`, JSON.stringify(updated));
                  }
                  return updated;
                });
              }}
              onDeleteEmployee={(empId) => {
                setEmployees((prev) => {
                  const updated = prev.filter((e) => e.id !== empId);
                  if (selectedBusiness) {
                    localStorage.setItem(`torli_employees_${selectedBusiness.id}`, JSON.stringify(updated));
                  }
                  return updated;
                });
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: MARKETING & MESSAGES */}
        {/* ========================================================================= */}
        {activeTab === "marketing" && (
          <div className="animate-in fade-in duration-200 space-y-4">
            <MarketingSection
              messages={marketingMessages}
              clients={clients}
              businessName={selectedBusiness.name}
              businessSlug={selectedBusiness.slug}
              onSendMessage={(newMsg) => {
                setMarketingMessages((prev) => [newMsg, ...prev]);
              }}
            />

            {/* Cron Reminders Tester Card */}
            <Card className="p-5 space-y-3 bg-gradient-to-br from-indigo-50/50 to-white border-indigo-100 text-right">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                  <Send className="w-5 h-5" />
                </div>
                <div className="text-right flex-1">
                  <h4 className="font-bold text-sm text-slate-900">
                    בדיקת מנגנון תזכורות אוטומטיות (Cron Worker)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    מדמה הרצת ה-Worker של ה-Cron (סורק תורים בטווח 24-25 שעות, שולח הודעות ומעדכן reminder_sent).
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleTriggerReminderCron}
                isLoading={isReminderRunning}
                className="w-full text-xs font-bold border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50"
              >
                <span>הפעל בדיקת תזכורות עכשיו (/api/cron/reminders)</span>
              </Button>

              {reminderResult && (
                <div className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto text-left ltr">
                  <pre>{JSON.stringify(reminderResult, null, 2)}</pre>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 9: CASH REGISTER (COMING SOON) */}
        {/* ========================================================================= */}
        {activeTab === "cashregister" && (
          <div className="animate-in fade-in duration-200">
            <CashRegisterSection
              todayRevenue={dailyStats.revenue}
              confirmedAppointmentsCount={dailyStats.confirmed}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 10: SETTINGS */}
        {/* ========================================================================= */}
        {activeTab === "settings" && (
          <div className="animate-in fade-in duration-200">
            <SettingsSection
              business={selectedBusiness}
              slotInterval={editingInterval}
              onUpdateSettings={async (updates) => {
                if (!selectedBusiness) return;
                if (updates.slot_interval_minutes) {
                  setEditingInterval(updates.slot_interval_minutes);
                }
                const res = await fetch("/api/business", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: selectedBusiness.id,
                    ...updates,
                  }),
                });
                if (res.ok) {
                  const updated = await res.json();
                  setSelectedBusiness(updated);
                }
              }}
              onDeleteBusiness={handleDeleteBusiness}
            />
          </div>
        )}
      </main>



      {/* ========================================================================= */}
      {/* MODAL 1: QUICK ADD / WALKIN */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        title="הוספת תור ידני / לקוח מזדמן"
        description="קבע תור מהיר ישירות ביומן העסק"
      >
        <form onSubmit={handleWalkinSubmit} className="space-y-4 text-right">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              בחר שירות *
            </label>
            <select
              value={walkinServiceId}
              onChange={(e) => setWalkinServiceId(e.target.value)}
              className="w-full h-12 rounded-2xl border border-slate-200 px-3 text-sm bg-white font-medium"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.duration_minutes} דק׳ + {s.buffer_minutes} מנוחה - ₪{s.price})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="שם פרטי *"
              placeholder="ישראל"
              value={walkinFirstName}
              onChange={(e) => setWalkinFirstName(e.target.value)}
              required
            />
            <Input
              label="שם משפחה"
              placeholder="ישראלי"
              value={walkinLastName}
              onChange={(e) => setWalkinLastName(e.target.value)}
            />
          </div>

          <Input
            label="טלפון נייד (10 ספרות)"
            type="tel"
            maxLength={12}
            placeholder="050-1234567"
            dir="ltr"
            className="text-right font-medium"
            value={walkinPhone}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
              let formatted = digits;
              if (digits.length > 3) {
                formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
              }
              setWalkinPhone(formatted);
            }}
            helperText={
              walkinPhone.replace(/\D/g, "").length === 10
                ? "✓ 10 ספרות תקינות"
                : walkinPhone.replace(/\D/g, "").length > 0
                ? `יש להזין 10 ספרות (${walkinPhone.replace(/\D/g, "").length}/10)`
                : "אופציונלי למזדמנים"
            }
          />

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              שעת התחלה *
            </label>
            <input
              type="time"
              value={walkinTime}
              onChange={(e) => setWalkinTime(e.target.value)}
              className="w-full h-12 rounded-2xl border border-slate-200 px-4 text-base font-bold bg-white"
              required
            />
          </div>

          <Button
            type="submit"
            size="lg"
            isLoading={isSubmittingWalkin}
            className="w-full mt-2"
          >
            <span>הוסף תור ליומן</span>
          </Button>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: BLOCK TIME (ONE-OFF) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isBlockTimeOpen}
        onClose={() => setIsBlockTimeOpen(false)}
        title="חסימת זמן חד-פעמית ביומן"
        description="המועד ייחסם ולא יאפשר ללקוחות להזמין תורים בשעות אלו"
      >
        <form onSubmit={handleBlockTimeSubmit} className="space-y-4 text-right">
          <Input
            label="סיבת החסימה"
            placeholder="הפסקת צהריים, סידורים אישיים..."
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                משעה *
              </label>
              <input
                type="time"
                value={blockStartTime}
                onChange={(e) => setBlockStartTime(e.target.value)}
                className="w-full h-12 rounded-2xl border border-slate-200 px-4 text-base font-bold bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                עד שעה *
              </label>
              <input
                type="time"
                value={blockEndTime}
                onChange={(e) => setBlockEndTime(e.target.value)}
                className="w-full h-12 rounded-2xl border border-slate-200 px-4 text-base font-bold bg-white"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            variant="destructive"
            isLoading={isSubmittingBlock}
            className="w-full mt-2"
          >
            <span>חסום זמן זה כעת</span>
          </Button>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: DAY ACTION QUICK SHEET */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!dayActionModalDate}
        onClose={() => setDayActionModalDate(null)}
        title={
          dayActionModalDate
            ? isBefore(dayActionModalDate, startOfToday())
              ? `היסטוריית יום ${formatHebrewDate(dayActionModalDate)}`
              : formatHebrewDate(dayActionModalDate)
            : "ניהול יום ביומן"
        }
        description={
          dayActionModalDate && isBefore(dayActionModalDate, startOfToday())
            ? "צפייה בתורים שהיו ביום זה והיסטוריית הלקוחות"
            : "פעולות מהירות ליום זה: צפייה בלוח הזמנים, סגירה נקודתית או סגירת שבוע"
        }
      >
        {dayActionModalDate && (() => {
          const override = getOverrideForDate(dayActionModalDate);
          const isOverrideClosed = override?.is_closed ?? false;
          const isWeeklyOpen = isBusinessOpenOnDay(dayActionModalDate);
          const dStr = format(dayActionModalDate, "yyyy-MM-dd");
          const appCount = appointmentsCountByDate[dStr] || 0;
          const isPastDate = isBefore(dayActionModalDate, startOfToday());

          return (
            <div className="space-y-4 text-right">
              {/* Day Status Summary Banner */}
              <div
                className={cn(
                  "p-3.5 rounded-2xl border text-sm space-y-1",
                  isPastDate
                    ? "bg-slate-100/90 border-slate-300 text-slate-800"
                    : isOverrideClosed
                    ? "bg-rose-50 border-rose-200 text-rose-900"
                    : !isWeeklyOpen
                    ? "bg-slate-50 border-slate-200 text-slate-700"
                    : "bg-emerald-50 border-emerald-200 text-emerald-900"
                )}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>סטטוס יום זה:</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-extrabold border bg-white">
                    {isPastDate
                      ? "תאריך מהעבר"
                      : isOverrideClosed
                      ? `סגור (${override?.reason || "חופשה"})`
                      : !isWeeklyOpen
                      ? "סגור קבוע בשבוע"
                      : "פתוח לקבלת קהל"}
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  {isPastDate
                    ? appCount > 0
                      ? `ביום זה התקיימו ${appCount} תורים במערכת`
                      : "לא נרשמו תורים ביום זה"
                    : appCount > 0
                    ? `קיימים ${appCount} תורים מוזמנים ליום זה`
                    : "אין עדיין תורים מוזמנים ליום זה"}
                </div>
              </div>

              {/* Action 1: View Daily Schedule / Historical View */}
              <Button
                size="lg"
                variant="primary"
                onClick={() => {
                  setSelectedDate(dayActionModalDate);
                  setScheduleMode("day");
                  setDayActionModalDate(null);
                  triggerHaptic(15);
                }}
                className="w-full flex items-center justify-center gap-2 font-bold shadow-md shadow-indigo-600/20"
              >
                {isPastDate ? (
                  <>
                    <History className="w-4 h-4 ml-1" />
                    <span>צפה בהיסטוריית התורים של יום זה ({appCount})</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 ml-1" />
                    <span>מעבר ליומן התורים של יום זה</span>
                  </>
                )}
              </Button>

              {/* Action 2 & 3: Close or Reopen (Only applicable for today or future dates) */}
              {!isPastDate && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-400 block mb-1">
                    פעולות סגירה ופתיחה מהירות:
                  </span>

                  {isOverrideClosed ? (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => handleToggleSingleDay(dayActionModalDate)}
                      className="w-full font-bold border-emerald-300 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-100/50"
                    >
                      <span>פתח מחדש יום זה לקבלת קהל</span>
                    </Button>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button
                        size="md"
                        variant="destructive"
                        onClick={() => handleToggleSingleDay(dayActionModalDate, 1)}
                        className="font-bold text-xs"
                      >
                        <CalendarX className="w-4 h-4 ml-1" />
                        <span>סגור רק את היום הזה</span>
                      </Button>
                      <Button
                        size="md"
                        variant="outline"
                        onClick={() => handleToggleSingleDay(dayActionModalDate, 7)}
                        className="font-bold text-xs border-rose-300 text-rose-800 bg-rose-50 hover:bg-rose-100"
                      >
                        <Palmtree className="w-4 h-4 ml-1 text-rose-600" />
                        <span>סגור שבוע שלם מיום זה</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 6: BATCH RANGE / VACATION CLOSURE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isRangeModalOpen}
        onClose={() => setIsRangeModalOpen(false)}
        title="סגירת שבוע שלם / חופשה מרוכזת"
        description="חסום שבוע או טווח ימים מלא לקבלת קהל בלחיצה אחת, בלי לעבור יום-יום"
      >
        <div className="space-y-4 text-right">
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">
              בחירה מהירה לפי תקופות:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  applyPresetThisWeek();
                }}
                className="p-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white hover:bg-indigo-50 hover:border-indigo-300 text-slate-800 text-right transition-all"
              >
                <div>השבוע (א׳ - ה׳)</div>
                <div className="text-[10px] text-slate-400 font-normal">סגור את השבוע הנוכחי</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  applyPresetNextWeek();
                }}
                className="p-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white hover:bg-indigo-50 hover:border-indigo-300 text-slate-800 text-right transition-all"
              >
                <div>שבוע הבא (א׳ - ה׳)</div>
                <div className="text-[10px] text-slate-400 font-normal">חופשה שבוע שלם</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  applyPresetWeekend();
                }}
                className="p-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white hover:bg-indigo-50 hover:border-indigo-300 text-slate-800 text-right transition-all"
              >
                <div>סוף שבוע (ה׳ + ו׳)</div>
                <div className="text-[10px] text-slate-400 font-normal">סגירת סופ״ש</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  applyPresetTwoWeeks();
                }}
                className="p-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white hover:bg-indigo-50 hover:border-indigo-300 text-slate-800 text-right transition-all"
              >
                <div>שבועיים חופשה</div>
                <div className="text-[10px] text-slate-400 font-normal">14 ימים ברצף</div>
              </button>
            </div>
          </div>

          {/* Date Pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                מתאריך: *
              </label>
              <input
                type="date"
                value={rangeStartDate}
                onChange={(e) => setRangeStartDate(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                עד תאריך: *
              </label>
              <input
                type="date"
                value={rangeEndDate}
                onChange={(e) => setRangeEndDate(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold bg-white"
                required
              />
            </div>
          </div>

          <Input
            label="סיבת הסגירה (תוצג ללקוחות) *"
            placeholder="חופשה שנתית, חול המועד, שיפוצים..."
            value={rangeReason}
            onChange={(e) => setRangeReason(e.target.value)}
            required
          />

          <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-xs text-amber-900 leading-snug">
            כל הימים בטווח הנבחר ייחסמו מיד ביומן הלקוחות. ניתן לפתוח אותם מחדש בכל עת.
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <Button
              size="lg"
              variant="destructive"
              onClick={() => handleRangeAction("close")}
              isLoading={isSubmittingRange}
              className="w-full font-bold"
            >
              <CalendarX className="w-4 h-4 ml-1.5" />
              <span>סגור את כל הימים בטווח זה</span>
            </Button>
            <Button
              size="md"
              variant="outline"
              onClick={() => handleRangeAction("open")}
              isLoading={isSubmittingRange}
              className="w-full font-semibold border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <span>בטל סגירה ופתח ימים אלו לקבלת קהל</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Floating Action Button (FAB) for quick operations */}
      <AdminFAB
        businessSlug={selectedBusiness.slug}
        businessName={selectedBusiness.name}
        onNewAppointment={() => {
          setWalkinServiceId(services[0]?.id || "");
          setIsQuickAddOpen(true);
        }}
        onBlockTime={() => setIsBlockTimeOpen(true)}
      />
    </div>
  );
}
