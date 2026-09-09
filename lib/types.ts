// ==============================================================================
// Domain Types for Appointment Scheduling SaaS (Hebrew / RTL)
// ==============================================================================

export type DayOfWeek =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

export interface DayBreak {
  active: boolean;
  start: string; // "HH:mm" e.g., "13:00"
  end: string;   // "HH:mm" e.g., "14:00"
}

export interface DayHours {
  open: string; // "HH:mm" e.g., "09:00"
  close: string; // "HH:mm" e.g., "19:00"
  active: boolean;
  lunch_break?: DayBreak;
}

export type WorkingHours = Record<DayOfWeek, DayHours>;

export interface DateOverride {
  id: string;
  date: string; // "YYYY-MM-DD"
  is_closed: boolean;
  reason: string; // e.g. "חג", "חופשה שנתית", "אירוע אישי", "שיפוצים"
  custom_open?: string;
  custom_close?: string;
}

export interface Business {
  id: string;
  slug: string;
  name: string;
  owner_phone: string;
  owner_email?: string;
  password?: string; // Strong password (min 8 chars, uppercase, lowercase, digit, special char)
  google_id?: string; // Google OAuth ID
  pin?: string; // 4-digit security PIN for owner login (legacy support)
  slot_interval_minutes?: number; // 15, 20, 30, 45, 60 (resolution)
  date_overrides?: DateOverride[]; // specific date closures/holidays
  working_hours: WorkingHours;
  created_at: string;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  duration_minutes: number;
  buffer_minutes: number;
  price: number;
  created_at?: string;
}

export interface Client {
  id: string;
  business_id: string;
  phone: string;
  first_name: string;
  last_name: string;
  email?: string;
  google_id?: string;
  auth_provider?: 'guest' | 'google';
  created_at?: string;
}

export type AppointmentStatus = 'confirmed' | 'cancelled';

export interface Appointment {
  id: string;
  business_id: string;
  service_id: string;
  client_id: string;
  start_time: string; // ISO timestamptz e.g., "2026-09-10T10:00:00Z"
  end_time: string; // ISO timestamptz
  status: AppointmentStatus;
  reminder_sent: boolean;
  notes?: string | null;
  created_at?: string;

  // Joined fields for convenience
  service?: Service;
  client?: Client;
  business?: Business;
}

export interface TimeSlot {
  startTime: string; // ISO string
  endTime: string; // ISO string
  formattedTime: string; // "10:30"
  period: 'morning' | 'afternoon' | 'evening';
  available: boolean;
}

export interface CreateBookingInput {
  business_id: string;
  service_id: string;
  phone: string;
  first_name: string;
  last_name: string;
  email?: string;
  google_id?: string;
  auth_provider?: 'guest' | 'google';
  start_time: string;
  notes?: string;
}

export interface BlockSlotInput {
  business_id: string;
  start_time: string;
  end_time: string;
  reason: string;
}

export interface CreateBusinessInput {
  name: string;
  slug: string;
  owner_phone: string;
  owner_email?: string;
  password?: string;
  google_id?: string;
  pin?: string;
  slot_interval_minutes?: number;
  category?: "barber" | "nails" | "therapy" | "general";
  working_hours?: WorkingHours;
}
