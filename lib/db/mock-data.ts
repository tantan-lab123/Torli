import { Business, Service, Client, Appointment } from "@/lib/types";

export const INITIAL_BUSINESSES: Business[] = [
  {
    id: "a1111111-1111-1111-1111-111111111111",
    slug: "barber-dan",
    name: "מספרת דניאל - Barber Dan",
    owner_phone: "0541234567",
    owner_email: "dan@barber-dan.co.il",
    password: "BarberDan2026!",
    pin: "1234",
    slot_interval_minutes: 15,
    date_overrides: [],
    working_hours: {
      sunday: { open: "09:00", close: "19:00", active: true, lunch_break: { active: true, start: "13:00", end: "14:00" } },
      monday: { open: "09:00", close: "19:00", active: true, lunch_break: { active: true, start: "13:00", end: "14:00" } },
      tuesday: { open: "09:00", close: "19:00", active: true, lunch_break: { active: true, start: "13:00", end: "14:00" } },
      wednesday: { open: "09:00", close: "19:00", active: true, lunch_break: { active: true, start: "13:00", end: "14:00" } },
      thursday: { open: "09:00", close: "20:00", active: true, lunch_break: { active: true, start: "13:00", end: "14:00" } },
      friday: { open: "08:30", close: "14:00", active: true, lunch_break: { active: false, start: "12:00", end: "12:30" } },
      saturday: { open: "00:00", close: "00:00", active: false },
    },
    created_at: new Date().toISOString(),
  },
  {
    id: "b2222222-2222-2222-2222-222222222222",
    slug: "maya-nails",
    name: "סטודיו מיה - ציפורניים ויופי",
    owner_phone: "0529876543",
    owner_email: "maya@maya-nails.co.il",
    password: "MayaNails2026!",
    pin: "1234",
    slot_interval_minutes: 30,
    date_overrides: [],
    working_hours: {
      sunday: { open: "09:30", close: "18:30", active: true, lunch_break: { active: true, start: "13:30", end: "14:30" } },
      monday: { open: "09:30", close: "18:30", active: true, lunch_break: { active: true, start: "13:30", end: "14:30" } },
      tuesday: { open: "09:30", close: "18:30", active: true, lunch_break: { active: true, start: "13:30", end: "14:30" } },
      wednesday: { open: "09:30", close: "18:30", active: true, lunch_break: { active: true, start: "13:30", end: "14:30" } },
      thursday: { open: "09:30", close: "19:30", active: true, lunch_break: { active: true, start: "13:30", end: "14:30" } },
      friday: { open: "09:00", close: "13:30", active: true, lunch_break: { active: false, start: "12:00", end: "12:30" } },
      saturday: { open: "00:00", close: "00:00", active: false },
    },
    created_at: new Date().toISOString(),
  },
  {
    id: "c3333333-3333-3333-3333-333333333333",
    slug: "clinic-rafael",
    name: "קליניקת רפאל - עיסוי ופיזיותרפיה",
    owner_phone: "0505556677",
    owner_email: "rafael@clinic-rafael.co.il",
    password: "RafaelClinic2026!",
    pin: "1234",
    slot_interval_minutes: 60,
    date_overrides: [],
    working_hours: {
      sunday: { open: "08:00", close: "20:00", active: true },
      monday: { open: "08:00", close: "20:00", active: true },
      tuesday: { open: "08:00", close: "20:00", active: true },
      wednesday: { open: "08:00", close: "20:00", active: true },
      thursday: { open: "08:00", close: "20:00", active: true },
      friday: { open: "08:00", close: "13:00", active: true },
      saturday: { open: "00:00", close: "00:00", active: false },
    },
    created_at: new Date().toISOString(),
  },
];

export const INITIAL_SERVICES: Service[] = [
  // Barber Dan services
  {
    id: "s-dan-1",
    business_id: "a1111111-1111-1111-1111-111111111111",
    name: "תספורת גברים קלאסית",
    duration_minutes: 30,
    buffer_minutes: 5,
    price: 80,
  },
  {
    id: "s-dan-2",
    business_id: "a1111111-1111-1111-1111-111111111111",
    name: "עיצוב וסידור זקן מדויק",
    duration_minutes: 20,
    buffer_minutes: 5,
    price: 50,
  },
  {
    id: "s-dan-3",
    business_id: "a1111111-1111-1111-1111-111111111111",
    name: "חבילת VIP: תספורת + זקן + חפיפה",
    duration_minutes: 45,
    buffer_minutes: 10,
    price: 120,
  },
  {
    id: "s-dan-4",
    business_id: "a1111111-1111-1111-1111-111111111111",
    name: "תספורת ילדים (עד גיל 12)",
    duration_minutes: 25,
    buffer_minutes: 5,
    price: 70,
  },

  // Maya Nails services
  {
    id: "s-maya-1",
    business_id: "b2222222-2222-2222-2222-222222222222",
    name: "מניקור רוסי משולב לק ג'ל",
    duration_minutes: 60,
    buffer_minutes: 10,
    price: 140,
  },
  {
    id: "s-maya-2",
    business_id: "b2222222-2222-2222-2222-222222222222",
    name: "מבנה אנטומי וחיזוק ציפורניים",
    duration_minutes: 75,
    buffer_minutes: 10,
    price: 180,
  },
  {
    id: "s-maya-3",
    business_id: "b2222222-2222-2222-2222-222222222222",
    name: "פדיקור רפואי / ספא מפנק",
    duration_minutes: 50,
    buffer_minutes: 10,
    price: 160,
  },

  // Rafael Clinic services
  {
    id: "s-raf-1",
    business_id: "c3333333-3333-3333-3333-333333333333",
    name: "עיסוי שוודי / רקמות עמוקות (50 דק')",
    duration_minutes: 50,
    buffer_minutes: 10,
    price: 250,
  },
  {
    id: "s-raf-2",
    business_id: "c3333333-3333-3333-3333-333333333333",
    name: "טיפול פיזיותרפיה ושיקום תנועה",
    duration_minutes: 45,
    buffer_minutes: 15,
    price: 300,
  },
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: "c-yossi",
    business_id: "a1111111-1111-1111-1111-111111111111",
    phone: "0501234567",
    first_name: "יוסי",
    last_name: "כהן",
  },
  {
    id: "c-itay",
    business_id: "a1111111-1111-1111-1111-111111111111",
    phone: "0524445566",
    first_name: "איתי",
    last_name: "מזרחי",
  },
  {
    id: "c-noa",
    business_id: "b2222222-2222-2222-2222-222222222222",
    phone: "0523334444",
    first_name: "נועה",
    last_name: "לוי",
  },
];

// Helper to seed appointments for today and tomorrow
export function createInitialAppointments(): Appointment[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  // Create ISO strings safely
  const todayHour = (h: number, m: number = 0) => new Date(year, month, day, h, m, 0).toISOString();
  const tomorrowHour = (h: number, m: number = 0) => new Date(year, month, day + 1, h, m, 0).toISOString();
  const yesterdayHour = (h: number, m: number = 0) => new Date(year, month, day - 1, h, m, 0).toISOString();
  const threeDaysAgoHour = (h: number, m: number = 0) => new Date(year, month, day - 3, h, m, 0).toISOString();

  return [
    {
      id: "app-past-1",
      business_id: "a1111111-1111-1111-1111-111111111111",
      service_id: "s-dan-1",
      client_id: "c-yossi",
      start_time: yesterdayHour(11, 0),
      end_time: yesterdayHour(11, 35),
      status: "confirmed",
      reminder_sent: true,
      notes: "תספורת וזקן - הושלם בהצלחה",
    },
    {
      id: "app-past-2",
      business_id: "a1111111-1111-1111-1111-111111111111",
      service_id: "s-dan-2",
      client_id: "c-itay",
      start_time: yesterdayHour(14, 0),
      end_time: yesterdayHour(14, 45),
      status: "confirmed",
      reminder_sent: true,
      notes: "עיצוב זקן",
    },
    {
      id: "app-past-3",
      business_id: "a1111111-1111-1111-1111-111111111111",
      service_id: "s-dan-3",
      client_id: "c-yossi",
      start_time: threeDaysAgoHour(16, 0),
      end_time: threeDaysAgoHour(16, 55),
      status: "confirmed",
      reminder_sent: true,
      notes: "טיפול VIP",
    },
    {
      id: "app-seed-1",
      business_id: "a1111111-1111-1111-1111-111111111111",
      service_id: "s-dan-1",
      client_id: "c-yossi",
      start_time: todayHour(10, 0),
      end_time: todayHour(10, 35),
      status: "confirmed",
      reminder_sent: true,
      notes: "לקוח קבוע",
    },
    {
      id: "app-seed-2",
      business_id: "a1111111-1111-1111-1111-111111111111",
      service_id: "s-dan-3",
      client_id: "c-itay",
      start_time: todayHour(12, 0),
      end_time: todayHour(12, 55),
      status: "confirmed",
      reminder_sent: true,
      notes: null,
    },
    {
      id: "app-seed-3",
      business_id: "a1111111-1111-1111-1111-111111111111",
      service_id: "s-dan-1",
      client_id: "c-yossi",
      start_time: tomorrowHour(11, 30),
      end_time: tomorrowHour(12, 5),
      status: "confirmed",
      reminder_sent: false, // will match 24h cron reminder check!
      notes: null,
    },
  ];
}
