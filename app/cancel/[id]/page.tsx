"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Scissors,
} from "lucide-react";
import { Appointment } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatHebrewDate, formatTime, triggerHaptic } from "@/lib/utils";

export default function CancelAppointmentPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.id as string;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelledSuccess, setIsCancelledSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAppointment = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/appointments/${appointmentId}`);
        if (!res.ok) {
          setError("התור המבוקש לא נמצא במערכת.");
          return;
        }
        const data = await res.json();
        setAppointment(data);
        if (data.status === "cancelled") {
          setIsCancelledSuccess(true);
        }
      } catch (err) {
        console.error("Error loading appointment:", err);
        setError("שגיאת תקשורת בטעינת פרטי התור.");
      } finally {
        setIsLoading(false);
      }
    };
    loadAppointment();
  }, [appointmentId]);

  const handleCancel = async () => {
    if (!appointment) return;
    setIsCancelling(true);
    triggerHaptic(30);

    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (!res.ok) {
        alert("שגיאה בביטול התור");
        setIsCancelling(false);
        return;
      }

      setIsCancelledSuccess(true);
      setAppointment((prev) => (prev ? { ...prev, status: "cancelled" } : null));
    } catch (err) {
      console.error("Cancel error:", err);
      alert("שגיאה בביטול התור");
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-500">טוען פרטי תור לביטול...</p>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center space-y-4">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">התור לא נמצא</h2>
          <p className="text-sm text-slate-500">{error || "הקישור אינו תקין או פג תוקף"}</p>
          <Button onClick={() => router.push("/")} variant="outline" className="w-full">
            חזרה לדף הראשי
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center justify-center">
      <div className="max-w-md w-full space-y-5">
        {/* Business Branding */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-2 shadow-md shadow-indigo-600/20">
            <Scissors className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            {appointment.business?.name || "מערכת תורים"}
          </h1>
          <p className="text-xs text-slate-500">ניהול וביטול תור</p>
        </div>

        {/* Status Card */}
        {isCancelledSuccess ? (
          <Card className="p-6 text-center space-y-4 border-2 border-emerald-100 bg-white">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">התור בוטל בהצלחה</h2>
              <p className="text-xs text-slate-500 mt-1">
                המועד שוחרר וכעת זמין ללקוחות אחרים.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 text-right text-xs space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span>שירות:</span>
                <span className="font-semibold text-slate-900">
                  {appointment.service?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span>מועד שבוטל:</span>
                <span className="font-semibold text-slate-900">
                  {formatHebrewDate(appointment.start_time)} בשעה {formatTime(appointment.start_time)}
                </span>
              </div>
            </div>

            {appointment.business?.slug && (
              <Button
                onClick={() => router.push(`/${appointment.business?.slug}`)}
                className="w-full"
              >
                <span>לקביעת תור חדש</span>
              </Button>
            )}
          </Card>
        ) : (
          <Card className="p-6 text-right space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs text-slate-400 block">סטטוס:</span>
                <Badge variant="success">מאושר</Badge>
              </div>
              <div className="text-right">
                <h3 className="font-bold text-base text-slate-900">
                  {appointment.service?.name}
                </h3>
                <span className="text-xs text-slate-500">
                  ₪{appointment.service?.price}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2.5 text-slate-700">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>{formatHebrewDate(appointment.start_time)}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>
                  בשעה {formatTime(appointment.start_time)} עד{" "}
                  {formatTime(appointment.end_time)}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700">
                <User className="w-4 h-4 text-indigo-600" />
                <span>
                  עבור: {appointment.client?.first_name} {appointment.client?.last_name}
                </span>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs text-rose-800">
              <p className="font-semibold mb-0.5">שים לב:</p>
              <p>ביטול התור ישחרר את המשבצת באופן מיידי ולא ניתן יהיה לשחזרו.</p>
            </div>

            {/* Cancel Action */}
            <div className="space-y-2 pt-2">
              <Button
                variant="destructive"
                size="lg"
                onClick={handleCancel}
                isLoading={isCancelling}
                className="w-full"
              >
                <span>בטל את התור עכשיו</span>
              </Button>

              {appointment.business?.slug && (
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/${appointment.business?.slug}`)}
                  className="w-full text-xs text-slate-500"
                >
                  חזרה לעמוד העסק
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
