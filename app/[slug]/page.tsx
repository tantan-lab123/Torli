"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Phone,
  Scissors,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CalendarPlus,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Business, Service, TimeSlot, Appointment } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  formatHebrewDate,
  formatShortDate,
  generateGoogleCalendarUrl,
  generateIcsDataUrl,
  triggerHaptic,
  cn,
} from "@/lib/utils";
import {
  addMonths,
  subMonths,
  format,
  isSameDay,
  isSameMonth,
  startOfToday,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isBefore,
  isToday,
} from "date-fns";
import { he } from "date-fns/locale";

const STORAGE_KEY = "schedule_saved_client_v1";

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  // State
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoadingBusiness, setIsLoadingBusiness] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Flow State: 1 = Service, 2 = Date & Time, 3 = Details, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Selections
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotMessage, setSlotMessage] = useState<string | undefined>();

  // Client Details Form
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [isGoogleClient, setIsGoogleClient] = useState(false);
  const [notes, setNotes] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isClientLookupLoading, setIsClientLookupLoading] = useState(false);
  const [isReturningClient, setIsReturningClient] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success State
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  // Monthly Calendar & Availability State
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfToday());
  const [monthAvailability, setMonthAvailability] = useState<
    Record<string, { hasSlots: boolean; count: number; isOpen: boolean; message?: string }>
  >({});
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);

  // Month days & weekday alignment
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startDayOfWeek = useMemo(() => {
    return getDay(startOfMonth(currentMonth)); // 0 = Sunday
  }, [currentMonth]);

  const canGoPrevMonth = useMemo(() => {
    return !isSameMonth(currentMonth, startOfToday());
  }, [currentMonth]);

  // Fetch Business and Services
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingBusiness(true);
        const res = await fetch(`/api/business?slug=${slug}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const bData = await res.json();
        setBusiness(bData);

        const sRes = await fetch(`/api/services?business_id=${bData.id}`);
        if (sRes.ok) {
          const sData = await sRes.json();
          setServices(sData);
          if (sData.length > 0) {
            setSelectedService(sData[0]);
          }
        }
      } catch (err) {
        console.error("Error loading business:", err);
        setNotFound(true);
      } finally {
        setIsLoadingBusiness(false);
      }
    };
    loadData();
  }, [slug]);

  // Load saved client info from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.firstName) setFirstName(parsed.firstName);
        if (parsed.lastName) setLastName(parsed.lastName);
        if (parsed.email) setClientEmail(parsed.email);
        if (parsed.isGoogleClient) setIsGoogleClient(parsed.isGoogleClient);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch month availability map whenever currentMonth, business or selectedService changes
  useEffect(() => {
    if (!business || !selectedService) return;

    const loadMonthData = async () => {
      try {
        setIsLoadingMonth(true);
        const monthStr = format(currentMonth, "yyyy-MM");
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const res = await fetch(
          `/api/slots?business_id=${business.id}&service_id=${selectedService.id}&month=${monthStr}&date=${dateStr}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.monthDays) {
            setMonthAvailability(data.monthDays);
          }
          if (data.slots) {
            setSlots(data.slots || []);
            setSlotMessage(data.message);
          }
        }
      } catch (err) {
        console.error("Error loading month data:", err);
      } finally {
        setIsLoadingMonth(false);
      }
    };

    loadMonthData();
  }, [business, selectedService, currentMonth, selectedDate]);

  // Handle user selecting a date on the calendar
  const handleSelectDate = async (date: Date) => {
    triggerHaptic(15);
    setSelectedDate(date);
    setSelectedSlot(null);

    // If day is from another month, navigate to it
    if (!isSameMonth(date, currentMonth)) {
      setCurrentMonth(date);
    }

    try {
      setIsLoadingSlots(true);
      const dateStr = format(date, "yyyy-MM-dd");
      const res = await fetch(
        `/api/slots?business_id=${business?.id}&service_id=${selectedService?.id}&date=${dateStr}`
      );
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
        setSlotMessage(data.message);
      }
    } catch (err) {
      console.error("Error loading slots:", err);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handlePrevMonth = () => {
    if (!canGoPrevMonth) return;
    triggerHaptic(10);
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    triggerHaptic(10);
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  // Phone lookup when phone is 10 digits
  useEffect(() => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10 && business) {
      const lookup = async () => {
        try {
          setIsClientLookupLoading(true);
          const res = await fetch(
            `/api/clients/lookup?business_id=${business?.id}&phone=${cleaned}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.exists && data.client) {
              setFirstName(data.client.first_name);
              setLastName(data.client.last_name);
              setIsReturningClient(true);
            } else {
              setIsReturningClient(false);
            }
          }
        } catch (err) {
          console.error("Client lookup error:", err);
        } finally {
          setIsClientLookupLoading(false);
        }
      };
      lookup();
    } else {
      setIsReturningClient(false);
    }
  }, [phone, business]);

  // Handle Form Submission
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !selectedService || !selectedSlot) return;

    const errors: { [key: string]: string } = {};
    const cleanedPhone = phone.replace(/\D/g, "");

    if (cleanedPhone.length < 9) {
      errors.phone = "אנא הזן מספר טלפון נייד תקין";
    }
    if (!firstName.trim()) {
      errors.firstName = "שם פרטי הוא שדה חובה";
    }
    if (!lastName.trim()) {
      errors.lastName = "שם משפחה הוא שדה חובה";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      triggerHaptic(40);
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: business.id,
          service_id: selectedService.id,
          phone: cleanedPhone,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: clientEmail.trim() || undefined,
          google_id: isGoogleClient ? "google-client-sub" : undefined,
          auth_provider: isGoogleClient ? "google" : "guest",
          start_time: selectedSlot.startTime,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "אירעה שגיאה בקביעת התור. אנא בחר מועד אחר.");
        setIsSubmitting(false);
        return;
      }

      // Persist in localStorage if checked
      if (rememberMe) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            phone: cleanedPhone,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: clientEmail.trim() || undefined,
            isGoogleClient,
          })
        );
      }

      setConfirmedAppointment(data.appointment);
      setStep(4);
      triggerHaptic(50);

      // Launch celebratory confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#6366f1", "#10b981", "#f59e0b", "#ec4899"],
      });
    } catch (err) {
      console.error("Booking error:", err);
      alert("שגיאת תקשורת. אנא נסה שוב.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading Screen
  if (isLoadingBusiness) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 font-medium">טוען את לוח התורים...</p>
      </div>
    );
  }

  // Not Found Screen
  if (notFound || !business) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">עסק לא נמצא</h1>
        <p className="text-slate-500 mb-6">
          העמוד שחיפשת אינו קיים במערכת. אנא בדוק את הקישור או פנה לבעל העסק.
        </p>
        <Button onClick={() => router.push("/")} variant="outline">
          חזרה לדף הראשי
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 md:pb-12">
      {/* Mobile App Bar / Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3.5 transition-all">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">
              <Scissors className="w-5 h-5" />
            </div>
            <div className="text-right">
              <h1 className="font-bold text-base text-slate-900 leading-tight">
                {business.name}
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>פתוח להזמנת תורים</span>
              </div>
            </div>
          </div>

          <a
            href={`tel:${business.owner_phone}`}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
            title="חייג לעסק"
          >
            <Phone className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Main Container - Mobile First Max Width */}
      <main className="max-w-md mx-auto px-4 pt-5 pb-36">
        {/* Progress Tracker (Steps 1, 2, 3) */}
        {step < 4 && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
              <span className={step === 1 ? "text-indigo-600" : ""}>1. בחירת שירות</span>
              <span className={step === 2 ? "text-indigo-600" : ""}>2. מועד ושעה</span>
              <span className={step === 3 ? "text-indigo-600" : ""}>3. פרטים ואישור</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: SELECT SERVICE */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="text-right mb-2">
              <h2 className="text-xl font-extrabold text-slate-900">בחר שירות</h2>
              <p className="text-sm text-slate-500">בחר את סוג הטיפול או השירות המבוקש</p>
            </div>

            <div className="space-y-3">
              {services.map((service) => {
                const isSelected = selectedService?.id === service.id;
                return (
                  <div
                    key={service.id}
                    onClick={() => {
                      triggerHaptic(20);
                      setSelectedService(service);
                    }}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between",
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/40 shadow-sm"
                        : "border-slate-200/80 bg-white hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                          isSelected
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-300 bg-white"
                        )}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>

                      <div className="text-right">
                        <h3 className="font-bold text-base text-slate-900 leading-snug">
                          {service.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {service.duration_minutes} דקות
                          </span>
                          {service.buffer_minutes > 0 && (
                            <span className="text-slate-400">
                              (+{service.buffer_minutes} מנוחה)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="text-lg font-extrabold text-indigo-600">
                        ₪{service.price}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Sticky Action */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-20">
              <div className="max-w-md mx-auto flex items-center justify-between gap-3">
                <div className="text-right">
                  <span className="text-xs text-slate-400">שירות נבחר:</span>
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {selectedService?.name || "בחר שירות"}
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={() => {
                    if (selectedService) setStep(2);
                  }}
                  disabled={!selectedService}
                  className="px-8 shadow-lg shadow-indigo-600/25"
                >
                  <span>המשך לבחירת מועד</span>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: SELECT DATE & TIME SLOT */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="space-y-5 pb-36 animate-in fade-in duration-200">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
                <span>חזרה לבחירת שירות</span>
              </button>
              <Badge variant="default">{selectedService?.name}</Badge>
            </div>

            <div className="text-right">
              <h2 className="text-xl font-extrabold text-slate-900">בחר יום ושעה</h2>
              <p className="text-sm text-slate-500">תורים פנויים מחושבים בזמן אמת</p>
            </div>

            {/* Full Month Interactive Calendar Card */}
            <Card className="p-4 sm:p-5 border border-slate-200/90 shadow-sm bg-white rounded-3xl space-y-4">
              {/* Month Navigation Header */}
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                {/* Previous Month (in RTL, Right arrow goes backward) */}
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  disabled={!canGoPrevMonth}
                  className={cn(
                    "p-2 rounded-xl transition-all flex items-center justify-center border",
                    canGoPrevMonth
                      ? "border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
                      : "border-slate-100 text-slate-300 opacity-30 cursor-not-allowed"
                  )}
                  title="חודש קודם"
                  aria-label="חודש קודם"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Current Month Title */}
                <div className="flex items-center justify-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-indigo-600" />
                  <span className="text-base sm:text-lg font-extrabold text-slate-900 capitalize">
                    {format(currentMonth, "MMMM yyyy", { locale: he })}
                  </span>
                  {isLoadingMonth && (
                    <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-1" />
                  )}
                </div>

                {/* Next Month (in RTL, Left arrow goes forward) */}
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all flex items-center justify-center"
                  title="חודש הבא"
                  aria-label="חודש הבא"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              {/* Weekday Column Headers (RTL: Sunday=א׳ on right, Saturday=ש׳ on left) */}
              <div className="grid grid-cols-7 gap-1 text-center select-none">
                {["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"].map((dayName, idx) => (
                  <div
                    key={idx}
                    className="text-xs font-bold text-slate-400 py-1"
                  >
                    {dayName}
                  </div>
                ))}
              </div>

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-y-2 gap-x-1 sm:gap-x-1.5 text-center items-center">
                {/* Empty cells before day 1 */}
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-pad-${i}`} className="h-10 sm:h-11" />
                ))}

                {/* Days in Month */}
                {monthDays.map((day, idx) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const dayNum = format(day, "d");
                  const isSelected = isSameDay(day, selectedDate);
                  const isPastDate = isBefore(day, startOfToday());
                  const dayAvail = monthAvailability[dateStr];
                  
                  // Has available slots check
                  const hasSlots = dayAvail ? dayAvail.hasSlots : false;
                  const canSelect = !isPastDate && hasSlots;

                  if (canSelect) {
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectDate(day)}
                        className={cn(
                          "relative w-9 h-9 sm:w-10 sm:h-10 mx-auto rounded-full flex flex-col items-center justify-center transition-all duration-150 group",
                          isSelected
                            ? "bg-indigo-600 text-white font-extrabold shadow-md shadow-indigo-600/35 ring-2 ring-indigo-200 scale-105"
                            : "bg-slate-100/90 text-slate-800 font-bold border border-slate-200/90 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-600 hover:scale-105 active:scale-95 shadow-2xs",
                          !isSelected && isToday(day) && "ring-2 ring-indigo-400/60 ring-offset-1"
                        )}
                        title={`תאריך ${formatHebrewDate(day)} - לחץ לבחירת שעה`}
                      >
                        <span className="text-xs sm:text-sm leading-none font-bold">
                          {dayNum}
                        </span>
                        {/* Dot indicator */}
                        <span
                          className={cn(
                            "w-1 h-1 rounded-full mt-0.5 transition-colors",
                            isSelected ? "bg-white" : "bg-emerald-500 group-hover:bg-indigo-500"
                          )}
                        />
                      </button>
                    );
                  }

                  // Non-selectable day (Past, Closed on working hours, Holiday override, or 0 free slots)
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled
                      aria-disabled="true"
                      className="w-9 h-9 sm:w-10 sm:h-10 mx-auto rounded-full flex items-center justify-center text-xs sm:text-sm text-slate-300 bg-transparent cursor-not-allowed opacity-35 select-none pointer-events-none"
                      title="אין תורים זמינים בתאריך זה"
                    >
                      <span>{dayNum}</span>
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-3 sm:gap-4 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center">
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                  </span>
                  <span>תורים זמינים</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-indigo-600" />
                  <span className="font-semibold text-slate-700">יום נבחר</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full text-slate-300 text-[10px] flex items-center justify-center font-bold">
                    —
                  </span>
                  <span>סגור / אין תורים</span>
                </div>
              </div>
            </Card>

            {/* Selected Date Header */}
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3.5 text-center text-sm font-semibold text-indigo-950 flex items-center justify-center gap-2 shadow-2xs">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>שעות פנויות ל{formatHebrewDate(selectedDate)}:</span>
            </div>

            {/* Slots Section */}
            {isLoadingSlots ? (
              <div className="py-12 text-center">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-500">בודק זמינות תורים...</p>
              </div>
            ) : slots.length === 0 ? (
              <div className="py-12 px-4 rounded-3xl border border-dashed border-slate-300 text-center bg-white">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="font-bold text-slate-800 mb-1">
                  {slotMessage || "אין שעות פנויות ביום זה"}
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  אנא בחר יום אחר מהרשימה שלמעלה כדי למצוא שעה נוחה
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Morning Slots */}
                {slots.some((s) => s.period === "morning") && (
                  <div>
                    <span className="block text-xs font-bold text-slate-400 mb-2 text-right">
                      בוקר (עד 12:00)
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {slots
                        .filter((s) => s.period === "morning")
                        .map((slot, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              triggerHaptic(15);
                              setSelectedSlot(slot);
                            }}
                            className={cn(
                              "h-12 rounded-xl text-sm font-bold border transition-all flex items-center justify-center",
                              selectedSlot?.startTime === slot.startTime
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30 scale-[1.02]"
                                : "bg-white text-slate-800 border-slate-200 hover:border-indigo-300"
                            )}
                          >
                            {slot.formattedTime}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Afternoon Slots */}
                {slots.some((s) => s.period === "afternoon") && (
                  <div>
                    <span className="block text-xs font-bold text-slate-400 mb-2 text-right">
                      צהריים (12:00 - 17:00)
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {slots
                        .filter((s) => s.period === "afternoon")
                        .map((slot, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              triggerHaptic(15);
                              setSelectedSlot(slot);
                            }}
                            className={cn(
                              "h-12 rounded-xl text-sm font-bold border transition-all flex items-center justify-center",
                              selectedSlot?.startTime === slot.startTime
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30 scale-[1.02]"
                                : "bg-white text-slate-800 border-slate-200 hover:border-indigo-300"
                            )}
                          >
                            {slot.formattedTime}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Evening Slots */}
                {slots.some((s) => s.period === "evening") && (
                  <div>
                    <span className="block text-xs font-bold text-slate-400 mb-2 text-right">
                      ערב (מ-17:00)
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {slots
                        .filter((s) => s.period === "evening")
                        .map((slot, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              triggerHaptic(15);
                              setSelectedSlot(slot);
                            }}
                            className={cn(
                              "h-12 rounded-xl text-sm font-bold border transition-all flex items-center justify-center",
                              selectedSlot?.startTime === slot.startTime
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30 scale-[1.02]"
                                : "bg-white text-slate-800 border-slate-200 hover:border-indigo-300"
                            )}
                          >
                            {slot.formattedTime}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Extra safety spacer for fixed bottom footer */}
            <div className="h-12" />

            {/* Bottom Sticky Action */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-20">
              <div className="max-w-md mx-auto flex items-center justify-between gap-3">
                <div className="text-right">
                  <span className="text-xs text-slate-400">שעה נבחרת:</span>
                  <p className="text-sm font-bold text-slate-900">
                    {selectedSlot ? selectedSlot.formattedTime : "אנא בחר שעה"}
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={() => {
                    if (selectedSlot) setStep(3);
                  }}
                  disabled={!selectedSlot}
                  className="px-8 shadow-lg shadow-indigo-600/25"
                >
                  <span>המשך להזנת פרטים</span>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: FRICTIONLESS CLIENT DETAILS */}
        {/* ========================================================================= */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
                <span>חזרה לבחירת שעה</span>
              </button>
              <Badge variant="success">
                {selectedSlot?.formattedTime} | {formatShortDate(selectedDate)}
              </Badge>
            </div>

            <div className="text-right">
              <h2 className="text-xl font-extrabold text-slate-900">פרטים אישיים ואישור</h2>
              <p className="text-sm text-slate-500">
                הזמן בקלות כאורח או התחבר עם חשבון Google (ללא סיסמה)
              </p>
            </div>

            {/* Client Fast Auth Choice: Google vs Guest (Strictly NO Passwords for Clients) */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">בחר אופן הזמנה:</span>
                <span className="text-[11px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                  ללא סיסמה • מהיר ומאובטח
                </span>
              </div>

              {!isGoogleClient ? (
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => {
                    triggerHaptic(20);
                    setIsGoogleClient(true);
                    if (!firstName) setFirstName("ישראל");
                    if (!lastName) setLastName("ישראלי");
                    if (!clientEmail) setClientEmail("israel.israeli@gmail.com");
                    if (!phone) setPhone("052-1234567");
                  }}
                  className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 border-slate-300 text-slate-800 font-bold shadow-xs py-2.5"
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>התחבר עם Google (מילוי פרטים אוטומטי)</span>
                </Button>
              ) : (
                <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 flex items-center justify-between text-right">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-emerald-950 block">מחובר באמצעות Google</span>
                      <span className="text-[11px] text-emerald-700 font-mono dir-ltr block">{clientEmail}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(15);
                      setIsGoogleClient(false);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                  >
                    המשך כאורח
                  </button>
                </div>
              )}
            </div>

            {/* Returning Client Banner */}
            {isReturningClient && !isGoogleClient && (
              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200/80 flex items-center gap-3 text-right">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-indigo-950">
                    שמחים לראותך שוב, {firstName}! ✨
                  </h4>
                  <p className="text-xs text-indigo-700">
                    זיהינו אותך במערכת והפרטים שלך מולאו אוטומטית.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              {/* Phone Input with Auto-completion indicator */}
              <div className="relative">
                <Input
                  label="מספר טלפון נייד *"
                  type="tel"
                  placeholder="050-1234567"
                  dir="ltr"
                  className="text-right font-medium text-lg"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  error={formErrors.phone}
                  helperText="הזן מספר לקבלת תזכורת בוואטסאפ"
                />
                {isClientLookupLoading && (
                  <div className="absolute left-3 top-10">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* First & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="שם פרטי *"
                  placeholder="ישראל"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  error={formErrors.firstName}
                />
                <Input
                  label="שם משפחה *"
                  placeholder="ישראלי"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  error={formErrors.lastName}
                />
              </div>

              {/* Optional Email */}
              <Input
                label="כתובת אימייל (אופציונלי)"
                type="email"
                placeholder="client@example.com"
                dir="ltr"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                helperText="לשליחת אישור זימון תור וזימון יומן למייל"
              />

              {/* Optional Notes */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1 text-right">
                  הערות לטיפול (אופציונלי)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="בקשות מיוחדות, דגשים..."
                  className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15 outline-none transition-all"
                />
              </div>

              {/* LocalStorage "Remember Me" Checkbox */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none text-right py-1">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span className="text-xs font-medium text-slate-600">
                  שמור את הפרטים שלי לפעם הבאה
                </span>
              </label>

              {/* Booking Summary Box */}
              <Card className="bg-slate-50 border-slate-200/80 p-4 space-y-2 text-right">
                <span className="text-xs font-bold text-slate-400 block">
                  סיכום ההזמנה:
                </span>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">שירות:</span>
                  <span className="font-bold text-slate-900">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">מועד:</span>
                  <span className="font-bold text-slate-900">
                    {formatHebrewDate(selectedDate)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">שעה:</span>
                  <span className="font-bold text-indigo-600 text-base">
                    {selectedSlot?.formattedTime}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-slate-200/80 pt-2 mt-2">
                  <span className="text-slate-700 font-medium">לתשלום במקום:</span>
                  <span className="text-lg font-extrabold text-slate-900">
                    ₪{selectedService?.price}
                  </span>
                </div>
              </Card>

              {/* Bottom Sticky Action */}
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-20">
                <div className="max-w-md mx-auto">
                  <Button
                    type="submit"
                    size="lg"
                    isLoading={isSubmitting}
                    className="w-full shadow-lg shadow-indigo-600/25"
                  >
                    <CheckCircle2 className="w-5 h-5 ml-2" />
                    <span>אישור וקביעת התור</span>
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: SUCCESS STATE */}
        {/* ========================================================================= */}
        {step === 4 && confirmedAppointment && (
          <div className="space-y-6 text-center animate-in zoom-in-95 duration-300 py-4">
            {/* Success Icon Badge */}
            <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto flex items-center justify-center shadow-soft">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">התור נקבע בהצלחה!</h2>
              <p className="text-sm text-slate-500 mt-1">
                נשלח אליך אישור ותזכורת לפני מועד התור
              </p>
            </div>

            {/* Appointment Ticket Card */}
            <Card className="border-2 border-indigo-100 bg-gradient-to-b from-indigo-50/50 to-white text-right p-5 space-y-3.5 shadow-elevated">
              <div className="border-b border-indigo-100 pb-3">
                <span className="text-xs text-indigo-600 font-semibold block">
                  {business.name}
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {confirmedAppointment.service?.name || selectedService?.name}
                </h3>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">תאריך:</span>
                  <span className="font-bold text-slate-900">
                    {formatHebrewDate(confirmedAppointment.start_time)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">שעה:</span>
                  <span className="font-bold text-indigo-600 text-base">
                    {format(new Date(confirmedAppointment.start_time), "HH:mm")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">עבור:</span>
                  <span className="font-bold text-slate-900">
                    {confirmedAppointment.client?.first_name || firstName}{" "}
                    {confirmedAppointment.client?.last_name || lastName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">מחיר לתשלום במקום:</span>
                  <span className="font-bold text-slate-900">
                    ₪{confirmedAppointment.service?.price || selectedService?.price}
                  </span>
                </div>
              </div>
            </Card>

            {/* Action Buttons: Add to Google Calendar & Apple/ICS */}
            <div className="space-y-2.5">
              <a
                href={generateGoogleCalendarUrl({
                  title: `תור ל${confirmedAppointment.service?.name || selectedService?.name} ב${business.name}`,
                  description: `נקבע תור דרך המערכת עבור ${firstName} ${lastName}`,
                  startTime: confirmedAppointment.start_time,
                  endTime: confirmedAppointment.end_time,
                  location: business.name,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-white border-2 border-indigo-600 text-indigo-700 font-bold hover:bg-indigo-50 active:bg-indigo-100 transition-colors shadow-sm"
              >
                <CalendarPlus className="w-5 h-5 text-indigo-600" />
                <span>הוסף ליומן Google</span>
              </a>

              <a
                href={generateIcsDataUrl({
                  title: `תור ל${confirmedAppointment.service?.name || selectedService?.name} ב${business.name}`,
                  description: `נקבע תור דרך המערכת עבור ${firstName} ${lastName}`,
                  startTime: confirmedAppointment.start_time,
                  endTime: confirmedAppointment.end_time,
                  location: business.name,
                })}
                download="appointment.ics"
                className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors text-sm"
              >
                <CalendarIcon className="w-4 h-4 text-slate-500" />
                <span>הורד קובץ יומן (Apple / Outlook)</span>
              </a>
            </div>

            {/* Unique Cancellation Link as Required */}
            <div className="pt-4 border-t border-slate-200 text-right">
              <span className="text-xs text-slate-500 block mb-1">
                רוצה לבטל או לשנות את מועד התור?
              </span>
              <a
                href={`/cancel/${confirmedAppointment.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 underline"
              >
                <span>קישור ישיר לביטול התור</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Book Another Appointment */}
            <div className="pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setStep(1);
                  setSelectedSlot(null);
                  setConfirmedAppointment(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                קבע תור נוסף
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
