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
 * Strict Israeli phone number validation - exactly 10 digits
 */
export function validatePhoneNumber(phone: string): {
  isValid: boolean;
  cleaned: string;
  formatted: string;
  error?: string;
} {
  const cleaned = phone.replace(/\D/g, "");

  if (!cleaned) {
    return {
      isValid: false,
      cleaned,
      formatted: phone,
      error: "נא להזין מספר טלפון נייד",
    };
  }

  if (cleaned.length < 10) {
    const missing = 10 - cleaned.length;
    return {
      isValid: false,
      cleaned,
      formatted: phone,
      error: `מספר הטלפון קצר מדי (${cleaned.length}/10 ספרות). חסרות ${missing} ספרות`,
    };
  }

  if (cleaned.length > 10) {
    const extra = cleaned.length - 10;
    return {
      isValid: false,
      cleaned,
      formatted: phone,
      error: `מספר הטלפון ארוך מדי (${cleaned.length}/10 ספרות). יש להסיר ${extra} ספרות`,
    };
  }

  if (!cleaned.startsWith("0")) {
    return {
      isValid: false,
      cleaned,
      formatted: phone,
      error: "מספר טלפון ישראלי חייב להתחיל בספרה 0 (לדוגמה: 050...)",
    };
  }

  // Format as 05X-XXXXXXX
  const formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return {
    isValid: true,
    cleaned,
    formatted,
  };
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

const HEBREW_DAYS_LETTERS = [
  "", "א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ז׳", "ח׳", "ט׳",
  "י׳", "י״א", "י״ב", "י״ג", "י״ד", "ט״ו", "ט״ז", "י״ז", "י״ח", "י״ט",
  "כ׳", "כ״א", "כ״ב", "כ״ג", "כ״ד", "כ״ה", "כ״ו", "כ״ז", "כ״ח", "כ״ט", "ל׳"
];

function convertHebrewYearToLetters(yearNum: number): string {
  // Common Hebrew year formatting for 5780-5799
  const yearLookup: Record<number, string> = {
    5784: "תשפ״ד",
    5785: "תשפ״ה",
    5786: "תשפ״ו",
    5787: "תשפ״ז",
    5788: "תשפ״ח",
    5789: "תשפ״ט",
    5790: "תש״ץ",
    5791: "תשצ״א",
    5792: "תשצ״ב",
    5793: "תשצ״ג",
    5794: "תשצ״ד",
    5795: "תשצ״ה",
  };
  return yearLookup[yearNum] || String(yearNum);
}

/**
 * Format a date in Jewish/Hebrew calendar (e.g. "כ״ט באלול", "כ״ט באלול תשפ״ו")
 */
export function formatJewishDate(date: Date | string, includeYear = false): string {
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    const parts = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).formatToParts(d);

    const dayNum = Number(parts.find((p) => p.type === "day")?.value || 0);
    const month = (parts.find((p) => p.type === "month")?.value || "").trim();
    const year = Number(parts.find((p) => p.type === "year")?.value || 0);

    const hebrewDay = HEBREW_DAYS_LETTERS[dayNum] || String(dayNum);
    const monthFormatted = month.startsWith("ב") ? month : `ב${month}`;
    const hebrewYear = includeYear ? ` ${convertHebrewYearToLetters(year)}` : "";

    return `${hebrewDay} ${monthFormatted}${hebrewYear}`.trim();
  } catch {
    return "";
  }
}

/**
 * Return Hebrew day letter only (e.g. "כ״ט", "ט״ו", "א׳")
 */
export function getHebrewDayLetter(date: Date | string): string {
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    const parts = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", {
      day: "numeric",
    }).formatToParts(d);
    const dayNum = Number(parts.find((p) => p.type === "day")?.value || 0);
    return HEBREW_DAYS_LETTERS[dayNum] || String(dayNum);
  } catch {
    return "";
  }
}

/**
 * Return Shabbat status or major Jewish Holiday for a given date
 */
export function getJewishHolidayOrShabbat(date: Date | string): string | null {
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    const dayOfWeek = d.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat

    // Check Hebrew month and day using he-IL locale
    const parts = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", {
      month: "long",
      day: "numeric",
    }).formatToParts(d);

    const hDay = Number(parts.find((p) => p.type === "day")?.value || 0);
    const hMonth = (parts.find((p) => p.type === "month")?.value || "").trim();

    // Jewish Holidays mapping
    if (hMonth.includes("תשרי")) {
      if (hDay === 1 || hDay === 2) return "ראש השנה";
      if (hDay === 3) return "צום גדליה";
      if (hDay === 9) return "ערב יום כיפור";
      if (hDay === 10) return "יום כיפור";
      if (hDay === 14) return "ערב סוכות";
      if (hDay === 15) return "חג סוכות";
      if (hDay === 21) return "הושענא רבה";
      if (hDay > 15 && hDay < 21) return "חול המועד סוכות";
      if (hDay === 22) return "שמחת תורה";
      if (hDay === 23) return "אסרו חג סוכות";
    } else if (hMonth.includes("כסלו")) {
      if (hDay >= 25) return "חנוכה";
    } else if (hMonth.includes("טבת")) {
      if (hDay <= 2 || hDay === 3) return "חנוכה";
      if (hDay === 10) return "צום עשרה בטבת";
    } else if (hMonth.includes("שבט")) {
      if (hDay === 15) return "ט״ו בשבט";
    } else if (hMonth.includes("אדר")) {
      if (hMonth.includes("אדר א")) {
        if (hDay === 14) return "פורים קטן";
        if (hDay === 15) return "שושן פורים קטן";
      } else {
        if (hDay === 13) return "תענית אסתר";
        if (hDay === 14) return "חג פורים";
        if (hDay === 15) return "שושן פורים";
      }
    } else if (hMonth.includes("ניסן")) {
      if (hDay === 14) return "ערב פסח";
      if (hDay === 15 || hDay === 21) return "חג הפסח";
      if (hDay > 15 && hDay < 21) return "חול המועד פסח";
      if (hDay === 22) return "אסרו חג פסח";
    } else if (hMonth.includes("אייר")) {
      if (hDay === 4) return "יום הזיכרון";
      if (hDay === 5) return "יום העצמאות";
      if (hDay === 18) return "ל״ג בעומר";
      if (hDay === 28) return "יום ירושלים";
    } else if (hMonth.includes("סיוון")) {
      if (hDay === 5) return "ערב שבועות";
      if (hDay === 6) return "חג שבועות";
      if (hDay === 7) return "אסרו חג שבועות";
    } else if (hMonth.includes("תמוז")) {
      if (hDay === 17) return "צום שבעה עשר בתמוז";
    } else if (hMonth.includes("אב")) {
      if (hDay === 9) return "צום תשעה באב";
      if (hDay === 15) return "ט״ו באב";
    } else if (hMonth.includes("אלול")) {
      if (hDay === 29) return "ערב ראש השנה";
    }

    // Shabbat check
    if (dayOfWeek === 6) return "שבת קודש";
    if (dayOfWeek === 5) return "ערב שבת";

    return null;
  } catch {
    return null;
  }
}

/**
 * Generate 6-character random lowercase alphanumeric slug (e.g. "aiohi7", "kx9m2p")
 */
export function generateRandomSlug(length = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
