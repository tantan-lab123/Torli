import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format Israeli phone number for display (e.g. 0501234567 -> 050-1234567)
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10 && cleaned.startsWith("05")) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }
  return phone;
}

/**
 * Clean phone for tel: and wa.me: (e.g. 0541234567 -> 972541234567)
 */
export function toInternationalPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    return `972${cleaned.slice(1)}`;
  }
  return cleaned;
}

/**
 * Format date in friendly Hebrew string (e.g., "יום חמישי, 10 בספטמבר")
 */
export function formatHebrewDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "EEEE, d בMMMM", { locale: he });
}

/**
 * Format short date (e.g., "10/09")
 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM");
}

/**
 * Format time (e.g., "14:30")
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "HH:mm");
}

/**
 * Generate Google Calendar Web URL
 */
export function generateGoogleCalendarUrl({
  title,
  description,
  startTime,
  endTime,
  location,
}: {
  title: string;
  description: string;
  startTime: string | Date;
  endTime: string | Date;
  location?: string;
}): string {
  const start = typeof startTime === "string" ? parseISO(startTime) : startTime;
  const end = typeof endTime === "string" ? parseISO(endTime) : endTime;

  // Google Calendar format: YYYYMMDDTHHmmssZ
  const formatDateToGCal = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatDateToGCal(start)}/${formatDateToGCal(end)}`,
    details: description,
    ...(location ? { location } : {}),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate an .ics iCalendar file content data URL for download
 */
export function generateIcsDataUrl({
  title,
  description,
  startTime,
  endTime,
  location,
}: {
  title: string;
  description: string;
  startTime: string | Date;
  endTime: string | Date;
  location?: string;
}): string {
  const start = typeof startTime === "string" ? parseISO(startTime) : startTime;
  const end = typeof endTime === "string" ? parseISO(endTime) : endTime;

  const formatDateToIcs = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SaaS Appointment Scheduler//HE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `DTSTART:${formatDateToIcs(start)}`,
    `DTEND:${formatDateToIcs(end)}`,
    `DTSTAMP:${formatDateToIcs(new Date())}`,
    `UID:${Date.now()}@schedule.app`,
    ...(location ? [`LOCATION:${location}`] : []),
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`;
}

/**
 * Trigger subtle haptic vibration if supported on mobile
 */
export function triggerHaptic(duration = 20) {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(duration);
    } catch {
      // ignore
    }
  }
}

/**
 * Validate strong password requirements:
 * - 8+ characters
 * - Uppercase letter (A-Z)
 * - Lowercase letter (a-z)
 * - Number (0-9)
 * - Special character (!@#$%^&* etc.)
 */
export interface PasswordValidationResult {
  hasMinLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isValid: boolean;
}

export function validatePassword(password: string): PasswordValidationResult {
  const hasMinLength = (password || "").length >= 8;
  const hasUpper = /[A-Z]/.test(password || "");
  const hasLower = /[a-z]/.test(password || "");
  const hasNumber = /\d/.test(password || "");
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password || "");
  return {
    hasMinLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    isValid: hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial,
  };
}
