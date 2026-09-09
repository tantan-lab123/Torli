"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Clock,
  Phone,
  MessageCircle,
  Plus,
  Ban,
  Settings,
  Scissors,
  XCircle,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  Trash2,
  Send,
  RefreshCw,
  ExternalLink,
  LogOut,
  Coffee,
  Sparkles,
  Sliders,
  AlertCircle,
  Lock,
  CalendarX,
  Palmtree,
  KeyRound,
  Check,
  History,
} from "lucide-react";
import {
  Business,
  Service,
  Appointment,
  DayOfWeek,
  DayBreak,
  DateOverride,
} from "@/lib/types";
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
} from "@/lib/utils";
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

const ADMIN_SESSION_KEY = "schedule_active_business_slug_v2";

export default function AdminDashboardPage() {
  // Businesses & active business
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View state: 'schedule' | 'settings'
  const [activeTab, setActiveTab] = useState<"schedule" | "settings">("schedule");
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
  const [loginPin, setLoginPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // New Business Registration Form
  const [regName, setRegName] = useState("");
  const [regSlug, setRegSlug] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const regPin = "1234";
  const [regInterval, setRegInterval] = useState("15");
  const [regCategory, setRegCategory] = useState<"barber" | "nails" | "therapy" | "general">("barber");
  const [isRegistering, setIsRegistering] = useState(false);
  const [regError, setRegError] = useState("");

  // Real-time password validation for registration
  const passwordValidation = useMemo(() => {
    return validatePassword(regPassword);
  }, [regPassword]);

  // Modals state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isBlockTimeOpen, setIsBlockTimeOpen] = useState(false);
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [isAddHolidayOpen, setIsAddHolidayOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
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

  // Service form (for both Add and Edit)
  const [serviceFormName, setServiceFormName] = useState("");
  const [serviceFormDuration, setServiceFormDuration] = useState("30");
  const [serviceFormBuffer, setServiceFormBuffer] = useState("10");
  const [serviceFormPrice, setServiceFormPrice] = useState("80");
  const [isSubmittingService, setIsSubmittingService] = useState(false);

  // Working hours, Interval, and Overrides editing state
  const [editingWorkingHours, setEditingWorkingHours] = useState<Business["working_hours"] | null>(null);
  const [editingInterval, setEditingInterval] = useState<number>(15);
  const [editingOverrides, setEditingOverrides] = useState<DateOverride[]>([]);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Holiday override form
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayReason, setHolidayReason] = useState("חג / יום שבתון");

  // Restore authenticated session from localStorage
  useEffect(() => {
    const restoreSession = async () => {
      try {
        setIsLoading(true);
        const savedSlug = localStorage.getItem(ADMIN_SESSION_KEY);
        if (savedSlug) {
          const res = await fetch(`/api/business?slug=${savedSlug}`);
          if (res.ok) {
            const biz: Business = await res.json();
            setSelectedBusiness(biz);
            setEditingWorkingHours(biz.working_hours);
            setEditingInterval(biz.slot_interval_minutes || 15);
            setEditingOverrides(biz.date_overrides || []);
          } else {
            localStorage.removeItem(ADMIN_SESSION_KEY);
          }
        }
      } catch (err) {
        console.error("Session restore error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  // Handle Private Owner Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);
    triggerHaptic(20);

    const credentialKey = loginPassword.trim() || loginPin.trim();

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: loginPhone.trim(),
          password: credentialKey,
          pin: credentialKey,
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
    setLoginError("");
    setIsLoggingIn(true);
    triggerHaptic(20);

    try {
      // In web app / demo environment, initiate Google OAuth exchange
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "google",
          email: "dan@barber-dan.co.il",
          googleId: "google-owner-dan",
          name: "Daniel Owner",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "שגיאה בהתחברות עם חשבון Google");
        setIsLoggingIn(false);
        return;
      }

      const biz: Business = data.business;
      setSelectedBusiness(biz);
      setEditingWorkingHours(biz.working_hours);
      setEditingInterval(biz.slot_interval_minutes || 15);
      setEditingOverrides(biz.date_overrides || []);
      localStorage.setItem(ADMIN_SESSION_KEY, biz.slug);
      triggerHaptic(45);
    } catch (err) {
      console.error(err);
      setLoginError("שגיאת תקשורת בהתחברות Google");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setSelectedBusiness(null);
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setLoginPin("");
    setLoginPassword("");
    triggerHaptic(25);
  };

  // Auto-generate slug from name in registration form
  const handleRegNameChange = (name: string) => {
    setRegName(name);
    const generated = name
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    if (!regSlug || regSlug.startsWith(generated.slice(0, 3))) {
      setRegSlug(generated || "salon-" + Math.floor(Math.random() * 1000));
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

    if (regPassword) {
      if (!passwordValidation.isValid) {
        setRegError("הסיסמה אינה עומדת בכל 5 כללי האבטחה הנדרשים");
        return;
      }
    } else if (!regPin.trim()) {
      setRegError("יש להגדיר סיסמה מאובטחת או קוד PIN");
      return;
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
          owner_email: regEmail.trim() || undefined,
          password: regPassword.trim() || undefined,
          pin: regPin.trim() || "1234",
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

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: selectedBusiness.id,
          service_id: walkinServiceId,
          phone: walkinPhone.replace(/\D/g, "") || "0500000000",
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

  // Open Service Modal for Add
  const openAddServiceModal = () => {
    setEditingService(null);
    setServiceFormName("");
    setServiceFormDuration("30");
    setServiceFormBuffer("10");
    setServiceFormPrice("80");
    setIsAddServiceOpen(true);
  };

  // Open Service Modal for Edit
  const openEditServiceModal = (service: Service) => {
    setEditingService(service);
    setServiceFormName(service.name);
    setServiceFormDuration(service.duration_minutes.toString());
    setServiceFormBuffer(service.buffer_minutes.toString());
    setServiceFormPrice(service.price.toString());
    setIsAddServiceOpen(true);
  };

  // Create or Update Service submit
  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness || !serviceFormName) return;

    setIsSubmittingService(true);
    triggerHaptic(20);

    try {
      if (editingService) {
        const res = await fetch("/api/services", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingService.id,
            name: serviceFormName,
            duration_minutes: Number(serviceFormDuration),
            buffer_minutes: Number(serviceFormBuffer),
            price: Number(serviceFormPrice),
          }),
        });
        if (res.ok) {
          setIsAddServiceOpen(false);
          fetchAppointments();
        }
      } else {
        const res = await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            business_id: selectedBusiness.id,
            name: serviceFormName,
            duration_minutes: Number(serviceFormDuration),
            buffer_minutes: Number(serviceFormBuffer),
            price: Number(serviceFormPrice),
          }),
        });
        if (res.ok) {
          setIsAddServiceOpen(false);
          fetchAppointments();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingService(false);
    }
  };

  // Delete service
  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("האם למחוק שירות זה?")) return;
    try {
      await fetch(`/api/services?id=${serviceId}`, { method: "DELETE" });
      fetchAppointments();
    } catch (err) {
      console.error(err);
    }
  };

  // Save Settings (Working hours, slot interval, date overrides)
  const handleSaveSettings = async () => {
    if (!selectedBusiness || !editingWorkingHours) return;
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedBusiness.id,
          working_hours: editingWorkingHours,
          slot_interval_minutes: editingInterval,
          date_overrides: editingOverrides,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedBusiness(updated);
        alert("כל ההגדרות נשמרו בהצלחה!");
      }
    } catch (err) {
      console.error(err);
      alert("שגיאה בשמירת ההגדרות");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Add Date Override (Holiday / Closure)
  const handleAddHolidaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate) return;

    const newOverride: DateOverride = {
      id: "ov-" + Math.random().toString(36).substring(2, 7),
      date: holidayDate,
      is_closed: true,
      reason: holidayReason.trim() || "חג / חופשה",
    };

    setEditingOverrides((prev) => [...prev.filter((o) => o.date !== holidayDate), newOverride]);
    setIsAddHolidayOpen(false);
    setHolidayDate("");
    setHolidayReason("חג / יום שבתון");
    triggerHaptic(20);
  };

  // Remove Date Override
  const handleRemoveOverride = (overrideId: string) => {
    setEditingOverrides((prev) => prev.filter((o) => o.id !== overrideId));
    triggerHaptic(15);
  };

  // Helper: Apply lunch break to all active days
  const applyLunchToAllDays = (sampleBreak: DayBreak) => {
    if (!editingWorkingHours) return;
    const updated = { ...editingWorkingHours };
    (Object.keys(updated) as DayOfWeek[]).forEach((day) => {
      if (updated[day].active) {
        updated[day] = {
          ...updated[day],
          lunch_break: { ...sampleBreak },
        };
      }
    });
    setEditingWorkingHours(updated);
    triggerHaptic(20);
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
                  label="סיסמה אישית (או קוד PIN) *"
                  type="password"
                  placeholder="הזן סיסמה או PIN"
                  dir="ltr"
                  className="text-right font-medium text-base"
                  value={loginPassword || loginPin}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setLoginPin(e.target.value);
                  }}
                  helperText="הזן סיסמה חזקה, או PIN (ברירת מחדל להדגמה: 1234)"
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
                <div>• מספרת דניאל: טלפון <span className="font-mono font-bold text-slate-800">0541234567</span> | סיסמה: <span className="font-mono font-bold text-slate-800">BarberDan2026!</span> (או PIN 1234)</div>
                <div>• סטודיו מיה: טלפון <span className="font-mono font-bold text-slate-800">0529876543</span> | סיסמה: <span className="font-mono font-bold text-slate-800">MayaNails2026!</span> (או PIN 1234)</div>
                <div>• קליניקת רפאל: טלפון <span className="font-mono font-bold text-slate-800">0505556677</span> | סיסמה: <span className="font-mono font-bold text-slate-800">RafaelClinic2026!</span> (או PIN 1234)</div>
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

              {/* 1-Tap Google Registration */}
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

              <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-right">
                <Input
                  label="שם בית העסק *"
                  placeholder="לדוגמה: מספרת אלירן, סטודיו זוהר"
                  value={regName}
                  onChange={(e) => handleRegNameChange(e.target.value)}
                  required
                />

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    סיומת כתובת האתר (Slug באנגלית) *
                  </label>
                  <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-3 h-12 ltr focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all">
                    <span className="text-xs text-slate-400 font-mono">schedule.app/</span>
                    <input
                      type="text"
                      value={regSlug}
                      onChange={(e) => setRegSlug(e.target.value)}
                      placeholder="eliran-barber"
                      className="w-full bg-transparent border-none text-sm font-bold text-indigo-600 focus:outline-none pl-1"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="טלפון נייד בעל העסק *"
                    type="tel"
                    placeholder="054-0001122"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    required
                  />
                  <Input
                    label="כתובת אימייל"
                    type="email"
                    placeholder="owner@example.com"
                    dir="ltr"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />
                </div>

                {/* Password field with Live Security Requirements Checklist */}
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
                  disabled={regPassword.length > 0 && !passwordValidation.isValid}
                  className="w-full mt-2"
                >
                  <Sparkles className="w-4 h-4 ml-2" />
                  <span>פתח עסק וכנס ישירות ליומן</span>
                </Button>
              </form>
            </Card>
          )}
        </div>
      </div>
    );
  }

  const daysList: DayOfWeek[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  const hebrewDaysMap: Record<DayOfWeek, string> = {
    sunday: "יום ראשון",
    monday: "יום שני",
    tuesday: "יום שלישי",
    wednesday: "יום רביעי",
    thursday: "יום חמישי",
    friday: "יום שישי",
    saturday: "יום שבת",
  };

  // =========================================================================
  // AUTHENTICATED: SCOPED PRIVATE DASHBOARD
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pb-24">
      {/* Mobile Top Sticky Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
              <Scissors className="w-4 h-4" />
            </div>
            <div className="text-right">
              <div className="text-sm font-extrabold text-slate-900 leading-tight">
                {selectedBusiness.name}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="font-mono">/{selectedBusiness.slug}</span>
                <a
                  href={`/${selectedBusiness.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-0.5"
                >
                  <span>עמוד ציבורי</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1.5 rounded-xl hover:bg-rose-100 transition-colors font-medium"
              title="התנתק מהחשבון"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>התנתק</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {/* Navigation Tabs (Schedule / Settings) */}
        <div className="flex bg-slate-200/80 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab("schedule")}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
              activeTab === "schedule"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <CalendarDays className="w-4 h-4" />
            <span>יומן תורים יומי</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
              activeTab === "settings"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Settings className="w-4 h-4" />
            <span>הגדרות, מרווחים וחגים</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: SCHEDULE VIEW */}
        {/* ========================================================================= */}
        {activeTab === "schedule" && (
          <div className="space-y-4 animate-in fade-in duration-200">
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
                            {isTodayDate && (
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                            )}
                          </div>

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
        {/* TAB 2: SETTINGS - INTERVAL RESOLUTION, HOLIDAYS & SERVICES */}
        {/* ========================================================================= */}
        {activeTab === "settings" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 1. SLOT INTERVAL RESOLUTION PICKER */}
            <Card className="p-5 space-y-3">
              <div className="text-right border-b border-slate-100 pb-2.5">
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2 justify-end">
                  <span>רזולוציית זימון תורים (מרווח בין שעות)</span>
                  <Clock className="w-5 h-5 text-indigo-600" />
                </h3>
                <p className="text-xs text-slate-500">
                  קבע באיזה מרווחי זמן תרצה שיוצעו תורים ללקוחות בעמוד ההזמנות
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                {[
                  { mins: 15, label: "כל 15 דק'", desc: "09:00, 09:15, 09:30" },
                  { mins: 20, label: "כל 20 דק'", desc: "09:00, 09:20, 09:40" },
                  { mins: 30, label: "כל 30 דק'", desc: "09:00, 09:30, 10:00" },
                  { mins: 45, label: "כל 45 דק'", desc: "09:00, 09:45, 10:30" },
                  { mins: 60, label: "כל שעה עגולה", desc: "09:00, 10:00, 11:00" },
                ].map((item) => (
                  <button
                    key={item.mins}
                    type="button"
                    onClick={() => {
                      triggerHaptic(20);
                      setEditingInterval(item.mins);
                    }}
                    className={cn(
                      "p-3 rounded-2xl border-2 text-right transition-all flex flex-col justify-between",
                      editingInterval === item.mins
                        ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900">
                        {item.label}
                      </span>
                      {editingInterval === item.mins && (
                        <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                          ✓
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </Card>

            {/* 2. HOLIDAYS & VACATIONS OVERRIDES */}
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="text-right">
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2 justify-end">
                    <span>חופשות, חגים וסגירות מיוחדות</span>
                    <Palmtree className="w-5 h-5 text-emerald-600" />
                  </h3>
                  <p className="text-xs text-slate-500">
                    סגירת תאריכים נקודתיים (למשל: סגור ביום שני הקרוב, או חופשת חול המועד)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      applyPresetNextWeek();
                      setIsRangeModalOpen(true);
                    }}
                    className="rounded-xl text-xs gap-1 shadow-xs"
                  >
                    <CalendarX className="w-3.5 h-3.5 ml-1" />
                    <span>סגור שבוע / חופשה</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddHolidayOpen(true)}
                    className="rounded-xl text-xs gap-1 border-emerald-300 text-emerald-800 bg-emerald-50/50"
                  >
                    <Plus className="w-3.5 h-3.5 ml-1" />
                    <span>הוסף יום בודד</span>
                  </Button>
                </div>
              </div>

              {editingOverrides.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  לא הוגדרו חופשות או חגים קרובים. לוח הפעילות הרגיל פעיל כרגיל.
                </div>
              ) : (
                <div className="space-y-2">
                  {editingOverrides.map((ov) => (
                    <div
                      key={ov.id}
                      className="p-3 rounded-2xl border border-rose-200 bg-rose-50/40 flex items-center justify-between text-right"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-rose-950">
                            {formatHebrewDate(ov.date)}
                          </span>
                          <Badge variant="destructive">סגור לקבלת קהל</Badge>
                        </div>
                        <p className="text-xs text-rose-700 mt-0.5">
                          סיבה: {ov.reason}
                        </p>
                      </div>

                      <button
                        onClick={() => handleRemoveOverride(ov.id)}
                        className="p-2 text-rose-400 hover:text-rose-600 rounded-lg"
                        title="בטל סגירה זו"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* 3. SERVICES MANAGEMENT WITH CUSTOM BUFFER/RECOVERY */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="text-right">
                  <h3 className="font-extrabold text-base text-slate-900">
                    ניהול שירותים, מחירים וזמני מנוחה
                  </h3>
                  <p className="text-xs text-slate-500">
                    הגדר לכל שירות את משך הטיפול וזמן ההתאוששות/הכנת העמדה (Buffer)
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={openAddServiceModal}
                  className="rounded-xl text-xs gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>שירות חדש</span>
                </Button>
              </div>

              <div className="space-y-2.5">
                {services.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between bg-white hover:border-slate-300 transition-all"
                  >
                    <div className="text-right">
                      <div className="font-bold text-sm text-slate-900">{s.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
                          {s.duration_minutes} דק׳ טיפול
                        </span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md font-semibold",
                            s.buffer_minutes >= 15
                              ? "bg-amber-100 text-amber-800"
                              : "bg-indigo-50 text-indigo-700"
                          )}
                        >
                          +{s.buffer_minutes} דק׳ מנוחה/התארגנות
                        </span>
                        <span className="font-bold text-slate-900">₪{s.price}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditServiceModal(s)}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors"
                        title="ערוך שירות ומנוחה"
                      >
                        <Sliders className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteService(s.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="מחק שירות"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* 4. OPERATING HOURS & RECURRING LUNCH BREAKS */}
            <Card className="p-5 space-y-4">
              <div className="text-right border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2 justify-end">
                  <span>שעות פעילות והפסקות צהריים קבועות</span>
                  <Coffee className="w-5 h-5 text-amber-600" />
                </h3>
                <p className="text-xs text-slate-500">
                  קבע שעות פעילות שבועיות והפסקות צהריים החוסמות תורים באופן אוטומטי
                </p>
              </div>

              {editingWorkingHours && (
                <div className="space-y-3">
                  {daysList.map((day) => {
                    const config = editingWorkingHours[day];
                    const lunch = config.lunch_break || {
                      active: false,
                      start: "13:00",
                      end: "14:00",
                    };

                    return (
                      <div
                        key={day}
                        className={cn(
                          "p-3.5 rounded-2xl border transition-all space-y-3",
                          config.active
                            ? "bg-white border-slate-200 shadow-sm"
                            : "bg-slate-50 border-slate-200 opacity-60"
                        )}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={config.active}
                              onChange={(e) => {
                                setEditingWorkingHours({
                                  ...editingWorkingHours,
                                  [day]: { ...config, active: e.target.checked },
                                });
                              }}
                              className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="font-bold text-sm text-slate-900 min-w-20 text-right">
                              {hebrewDaysMap[day]}
                            </span>
                          </div>

                          {config.active ? (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-500">שעות פתיחה:</span>
                              <input
                                type="time"
                                value={config.open}
                                onChange={(e) => {
                                  setEditingWorkingHours({
                                    ...editingWorkingHours,
                                    [day]: { ...config, open: e.target.value },
                                  });
                                }}
                                className="h-8 px-2 border rounded-lg bg-slate-50 font-bold"
                              />
                              <span>עד</span>
                              <input
                                type="time"
                                value={config.close}
                                onChange={(e) => {
                                  setEditingWorkingHours({
                                    ...editingWorkingHours,
                                    [day]: { ...config, close: e.target.value },
                                  });
                                }}
                                className="h-8 px-2 border rounded-lg bg-slate-50 font-bold"
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-semibold">
                              סגור
                            </span>
                          )}
                        </div>

                        {/* Configurable Lunch Break */}
                        {config.active && (
                          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs bg-amber-50/50 p-2 rounded-xl border border-amber-100">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={lunch.active}
                                onChange={(e) => {
                                  setEditingWorkingHours({
                                    ...editingWorkingHours,
                                    [day]: {
                                      ...config,
                                      lunch_break: {
                                        ...lunch,
                                        active: e.target.checked,
                                      },
                                    },
                                  });
                                }}
                                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                              />
                              <span className="font-bold text-amber-900 flex items-center gap-1">
                                <Coffee className="w-3.5 h-3.5 text-amber-600" />
                                <span>הפסקת צהריים / מנוחה:</span>
                              </span>
                            </div>

                            {lunch.active ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="time"
                                  value={lunch.start}
                                  onChange={(e) => {
                                    setEditingWorkingHours({
                                      ...editingWorkingHours,
                                      [day]: {
                                        ...config,
                                        lunch_break: {
                                          ...lunch,
                                          start: e.target.value,
                                        },
                                      },
                                    });
                                  }}
                                  className="h-7 px-2 border rounded-lg bg-white font-bold text-amber-900"
                                />
                                <span>עד</span>
                                <input
                                  type="time"
                                  value={lunch.end}
                                  onChange={(e) => {
                                    setEditingWorkingHours({
                                      ...editingWorkingHours,
                                      [day]: {
                                        ...config,
                                        lunch_break: {
                                          ...lunch,
                                          end: e.target.value,
                                        },
                                      },
                                    });
                                  }}
                                  className="h-7 px-2 border rounded-lg bg-white font-bold text-amber-900"
                                />
                                <button
                                  type="button"
                                  onClick={() => applyLunchToAllDays(lunch)}
                                  className="text-[11px] text-indigo-600 font-semibold hover:underline mr-1"
                                  title="החל שעות אלו על כל ימי השבוע הפעילים"
                                >
                                  החל על כולם
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400">ללא הפסקת צהריים</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* SAVE ALL SETTINGS BUTTON */}
            <Button
              onClick={handleSaveSettings}
              isLoading={isSavingSettings}
              size="lg"
              className="w-full shadow-lg shadow-indigo-600/25 h-13 text-base font-bold"
            >
              <span>שמור את כל ההגדרות (מרווחי תורים, שעות, וחגים)</span>
            </Button>

            {/* WhatsApp Reminder Cron Worker Tester */}
            <Card className="p-5 space-y-3 bg-gradient-to-br from-indigo-50/50 to-white border-indigo-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                  <Send className="w-5 h-5" />
                </div>
                <div className="text-right flex-1">
                  <h4 className="font-bold text-sm text-slate-900">
                    בדיקת מנגנון תזכורות אוטומטיות (Cron Worker)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    מדמה הרצת ה-Worker של ה-Cron (סורק תורים בטווח 24-25 שעות, שולח
                    הודעות וואטסאפ מדומות ומעדכן reminder_sent = true).
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
            label="טלפון נייד"
            type="tel"
            placeholder="050-1234567"
            value={walkinPhone}
            onChange={(e) => setWalkinPhone(e.target.value)}
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
      {/* MODAL 3: ADD OR EDIT SERVICE WITH CUSTOM RECOVERY/BUFFER TIME */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddServiceOpen}
        onClose={() => setIsAddServiceOpen(false)}
        title={editingService ? "עריכת שירות וזמני מנוחה" : "הוספת שירות חדש"}
        description="קבע את משך הטיפול, זמן ההתאוששות/הכנת העמדה, והמחיר"
      >
        <form onSubmit={handleServiceSubmit} className="space-y-4 text-right">
          <Input
            label="שם השירות *"
            placeholder="לדוגמה: צביעת שיער + פן, החלקה אורגנית"
            value={serviceFormName}
            onChange={(e) => setServiceFormName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="משך הטיפול בפועל (בדקות) *"
              type="number"
              value={serviceFormDuration}
              onChange={(e) => setServiceFormDuration(e.target.value)}
              helperText="כמה זמן נמשך הטיפול על הלקוח"
              required
            />
            <Input
              label="מחיר השירות (₪) *"
              type="number"
              value={serviceFormPrice}
              onChange={(e) => setServiceFormPrice(e.target.value)}
              required
            />
          </div>

          <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Coffee className="w-4 h-4 text-indigo-600" />
                <span>זמן התאוששות, מנוחה והכנת עמדה (Buffer)</span>
              </span>
              <span className="text-sm font-extrabold text-indigo-700">
                {serviceFormBuffer} דקות
              </span>
            </div>
            <p className="text-[11px] text-indigo-800 leading-snug">
              טיפולים מעייפים או מורכבים (החלקה, צבע, עיסוי עמוק) לוקחים יותר כוח ודורשים
              זמן מנוחה ארוך יותר לפני הלקוח הבא.
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {[0, 5, 10, 15, 20, 30, 45].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    triggerHaptic(15);
                    setServiceFormBuffer(mins.toString());
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-xl text-xs font-bold border transition-all",
                    serviceFormBuffer === mins.toString()
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
                  )}
                >
                  {mins === 0 ? "ללא מנוחה" : `${mins} דק'`}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-slate-500 pt-1 border-t border-indigo-100 flex justify-between">
              <span>סך הזמן שייחסם ביומן:</span>
              <span className="font-bold text-slate-900">
                {Number(serviceFormDuration) + Number(serviceFormBuffer)} דקות
              </span>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            isLoading={isSubmittingService}
            className="w-full mt-2"
          >
            <span>{editingService ? "שמור שינויים" : "צור שירות"}</span>
          </Button>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: ADD HOLIDAY / DATE CLOSURE OVERRIDE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddHolidayOpen}
        onClose={() => setIsAddHolidayOpen(false)}
        title="הוספת חופשה / חג / סגירה נקודתית"
        description="בחר תאריך ספציפי שבו בית העסק יהיה סגור לקבלת קהל"
      >
        <form onSubmit={handleAddHolidaySubmit} className="space-y-4 text-right">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              בחר תאריך לסגירה *
            </label>
            <input
              type="date"
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
              className="w-full h-12 rounded-2xl border border-slate-200 px-4 text-base font-bold bg-white"
              required
            />
          </div>

          <Input
            label="סיבת הסגירה (תוצג ללקוחות) *"
            placeholder="לדוגמה: יום בחירות, חול המועד, אירוע משפחתי, שיפוצים"
            value={holidayReason}
            onChange={(e) => setHolidayReason(e.target.value)}
            required
          />

          <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-xs text-amber-800 space-y-1">
            <p className="font-bold">לתשומת לבך:</p>
            <p>
              בתאריך זה, עמוד ההזמנות של הלקוחות יחסום לחלוטין את כל השעות ויציג הודעה
              ברורה שבית העסק סגור בתאריך זה לרגל {holidayReason || "חג/חופשה"}.
            </p>
          </div>

          <Button
            type="submit"
            size="lg"
            variant="destructive"
            className="w-full mt-2"
          >
            <CalendarX className="w-4 h-4 ml-2" />
            <span>סגור תאריך זה להזמנות</span>
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
    </div>
  );
}
