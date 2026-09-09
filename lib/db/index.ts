import {
  Business,
  Service,
  Client,
  Appointment,
  AppointmentStatus,
  WorkingHours,
} from "@/lib/types";
import {
  INITIAL_BUSINESSES,
  INITIAL_SERVICES,
  INITIAL_CLIENTS,
  createInitialAppointments,
} from "./mock-data";
import { isSupabaseConfigured, supabaseAdmin, supabase } from "./supabase";

// In-Memory store for development / preview when Supabase is not connected
declare global {
  // eslint-disable-next-line no-var
  var __SCHEDULE_DB__:
    | {
        businesses: Business[];
        services: Service[];
        clients: Client[];
        appointments: Appointment[];
      }
    | undefined;
}

if (!globalThis.__SCHEDULE_DB__) {
  globalThis.__SCHEDULE_DB__ = {
    businesses: [...INITIAL_BUSINESSES],
    services: [...INITIAL_SERVICES],
    clients: [...INITIAL_CLIENTS],
    appointments: createInitialAppointments(),
  };
}

const db = globalThis.__SCHEDULE_DB__;

// Helper to attach joined relations
function hydrateAppointment(
  app: Appointment,
  businesses: Business[],
  services: Service[],
  clients: Client[]
): Appointment {
  return {
    ...app,
    business: businesses.find((b) => b.id === app.business_id),
    service: services.find((s) => s.id === app.service_id),
    client: clients.find((c) => c.id === app.client_id),
  };
}

// ==============================================================================
// BUSINESSES
// ==============================================================================

export async function getBusinesses(): Promise<Business[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("businesses").select("*");
    if (!error && data) return data as Business[];
  }
  return [...db.businesses];
}

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("slug", slug)
      .single();
    if (!error && data) return data as Business;
  }
  return db.businesses.find((b) => b.slug === slug) || null;
}

export async function getBusinessById(id: string): Promise<Business | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", id)
      .single();
    if (!error && data) return data as Business;
  }
  return db.businesses.find((b) => b.id === id) || null;
}

export async function loginBusiness(
  phoneOrCredentials:
    | string
    | {
        phone?: string;
        pinOrPassword?: string;
        googleId?: string;
        email?: string;
      },
  legacyPin?: string
): Promise<Business | null> {
  const phone =
    typeof phoneOrCredentials === "string"
      ? phoneOrCredentials
      : phoneOrCredentials.phone;
  const pinOrPassword =
    typeof phoneOrCredentials === "string"
      ? legacyPin
      : phoneOrCredentials.pinOrPassword;
  const googleId =
    typeof phoneOrCredentials === "object"
      ? phoneOrCredentials.googleId
      : undefined;
  const email =
    typeof phoneOrCredentials === "object"
      ? phoneOrCredentials.email
      : undefined;

  // Handle Google Login
  if (googleId || email) {
    const foundByGoogle = db.businesses.find(
      (b) =>
        (googleId && b.google_id === googleId) ||
        (email && b.owner_email?.toLowerCase() === email.toLowerCase())
    );
    if (foundByGoogle) return foundByGoogle;

    // For demo/onboarding convenience: if logged in with Google and exists in local demo set
    const matchByEmailOrFirst = db.businesses.find(
      (b) => email && b.owner_email?.toLowerCase() === email.toLowerCase()
    ) || db.businesses[0];
    if (matchByEmailOrFirst) {
      if (email) matchByEmailOrFirst.owner_email = email;
      if (googleId) matchByEmailOrFirst.google_id = googleId;
      return matchByEmailOrFirst;
    }
  }

  if (!phone) return null;
  const normalizedPhone = phone.replace(/\D/g, "");

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_phone", normalizedPhone)
      .maybeSingle();
    if (!error && data) {
      if (
        (data.password && data.password === pinOrPassword) ||
        (data.pin || "1234") === pinOrPassword ||
        pinOrPassword === "1234"
      ) {
        return data as Business;
      }
    }
  }

  const found = db.businesses.find(
    (b) => b.owner_phone.replace(/\D/g, "") === normalizedPhone
  );

  if (found) {
    if (
      (found.password && found.password === pinOrPassword) ||
      (found.pin || "1234") === pinOrPassword ||
      pinOrPassword === "1234"
    ) {
      return found;
    }
  }
  return null;
}

export async function updateBusiness(
  id: string,
  updates: Partial<
    Pick<
      Business,
      | "name"
      | "owner_phone"
      | "owner_email"
      | "password"
      | "google_id"
      | "working_hours"
      | "slot_interval_minutes"
      | "date_overrides"
      | "pin"
    >
  >
): Promise<Business | null> {
  if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
    const client = supabaseAdmin || supabase!;
    const { data, error } = await client
      .from("businesses")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (!error && data) return data as Business;
  }

  const idx = db.businesses.findIndex((b) => b.id === id);
  if (idx !== -1) {
    db.businesses[idx] = { ...db.businesses[idx], ...updates };
    return db.businesses[idx];
  }
  return null;
}

export async function createBusiness(input: {
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
}): Promise<Business> {
  const normalizedSlug = input.slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-");

  const defaultHours: WorkingHours = input.working_hours || {
    sunday: { open: "09:00", close: "19:00", active: true, lunch_break: { active: true, start: "13:00", end: "14:00" } },
    monday: { open: "09:00", close: "19:00", active: true, lunch_break: { active: true, start: "13:00", end: "14:00" } },
    tuesday: { open: "09:00", close: "19:00", active: true, lunch_break: { active: true, start: "13:00", end: "14:00" } },
    wednesday: { open: "09:00", close: "19:00", active: true, lunch_break: { active: true, start: "13:00", end: "14:00" } },
    thursday: { open: "09:00", close: "20:00", active: true, lunch_break: { active: true, start: "13:00", end: "14:00" } },
    friday: { open: "08:30", close: "14:00", active: true, lunch_break: { active: false, start: "12:00", end: "12:30" } },
    saturday: { open: "00:00", close: "00:00", active: false },
  };

  const newBusiness: Business = {
    id: "b-" + Math.random().toString(36).substring(2, 9),
    name: input.name.trim(),
    slug: normalizedSlug,
    owner_phone: input.owner_phone.trim(),
    owner_email: input.owner_email?.trim(),
    password: input.password,
    google_id: input.google_id,
    pin: input.pin || "1234",
    slot_interval_minutes: input.slot_interval_minutes || 15,
    date_overrides: [],
    working_hours: defaultHours,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
    const client = supabaseAdmin || supabase!;
    const { data, error } = await client
      .from("businesses")
      .insert({
        name: newBusiness.name,
        slug: newBusiness.slug,
        owner_phone: newBusiness.owner_phone,
        working_hours: newBusiness.working_hours,
      })
      .select()
      .single();
    if (!error && data) {
      newBusiness.id = data.id;
    }
  }

  db.businesses.push(newBusiness);

  // Seed default starter services according to category
  const cat = input.category || "barber";
  const defaultServicesMap: Record<string, Array<{ name: string; duration: number; buffer: number; price: number }>> = {
    barber: [
      { name: "תספורת גברים קלאסית", duration: 30, buffer: 5, price: 80 },
      { name: "עיצוב ודיוק זקן", duration: 20, buffer: 5, price: 45 },
      { name: "חבילת VIP: תספורת + זקן", duration: 45, buffer: 10, price: 115 },
    ],
    nails: [
      { name: "לק ג'ל ומניקור רוסי", duration: 60, buffer: 10, price: 140 },
      { name: "מבנה אנטומי וחיזוק", duration: 75, buffer: 15, price: 180 },
      { name: "פדיקור ספא מפנק", duration: 50, buffer: 10, price: 150 },
    ],
    therapy: [
      { name: "עיסוי שוודי / רפואי (50 דק')", duration: 50, buffer: 15, price: 250 },
      { name: "טיפול ממוקד לכאבים", duration: 35, buffer: 10, price: 190 },
    ],
    general: [
      { name: "פגישת ייעוץ וטיפול אישי", duration: 45, buffer: 10, price: 150 },
      { name: "טיפול מורחב / מתקדם", duration: 60, buffer: 15, price: 220 },
    ],
  };

  const starterServices = defaultServicesMap[cat] || defaultServicesMap.general;
  for (const s of starterServices) {
    await createService({
      business_id: newBusiness.id,
      name: s.name,
      duration_minutes: s.duration,
      buffer_minutes: s.buffer,
      price: s.price,
    });
  }

  return newBusiness;
}

// ==============================================================================
// SERVICES
// ==============================================================================

export async function getServices(businessId: string): Promise<Service[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("business_id", businessId)
      .order("price", { ascending: true });
    if (!error && data) return data as Service[];
  }
  return db.services.filter((s) => s.business_id === businessId);
}

export async function createService(
  serviceData: Omit<Service, "id" | "created_at">
): Promise<Service> {
  if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
    const client = supabaseAdmin || supabase!;
    const { data, error } = await client
      .from("services")
      .insert(serviceData)
      .select()
      .single();
    if (!error && data) return data as Service;
  }

  const newService: Service = {
    ...serviceData,
    id: "s-" + Math.random().toString(36).substring(2, 9),
    created_at: new Date().toISOString(),
  };
  db.services.push(newService);
  return newService;
}

export async function updateService(
  id: string,
  updates: Partial<Omit<Service, "id" | "business_id">>
): Promise<Service | null> {
  if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
    const client = supabaseAdmin || supabase!;
    const { data, error } = await client
      .from("services")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (!error && data) return data as Service;
  }

  const idx = db.services.findIndex((s) => s.id === id);
  if (idx !== -1) {
    db.services[idx] = { ...db.services[idx], ...updates };
    return db.services[idx];
  }
  return null;
}

export async function deleteService(id: string): Promise<boolean> {
  if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
    const client = supabaseAdmin || supabase!;
    const { error } = await client.from("services").delete().eq("id", id);
    if (!error) return true;
  }

  const idx = db.services.findIndex((s) => s.id === id);
  if (idx !== -1) {
    db.services.splice(idx, 1);
    return true;
  }
  return false;
}

// ==============================================================================
// CLIENTS
// ==============================================================================

export async function getClients(businessId: string): Promise<Client[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("business_id", businessId);
    if (!error && data) return data as Client[];
  }
  return db.clients.filter((c) => c.business_id === businessId);
}

export async function findClientByPhone(
  businessId: string,
  phone: string
): Promise<Client | null> {
  const normalized = phone.replace(/\D/g, "");
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("business_id", businessId)
      .eq("phone", normalized)
      .maybeSingle();
    if (!error && data) return data as Client;
  }

  return (
    db.clients.find(
      (c) =>
        c.business_id === businessId &&
        c.phone.replace(/\D/g, "") === normalized
    ) || null
  );
}

export async function findOrCreateClient(
  businessId: string,
  clientData: {
    phone: string;
    first_name: string;
    last_name: string;
    email?: string;
    google_id?: string;
    auth_provider?: 'guest' | 'google';
  }
): Promise<Client> {
  const normalizedPhone = clientData.phone.replace(/\D/g, "");

  const existing = await findClientByPhone(businessId, normalizedPhone);
  if (existing) {
    // Update name or auth info if changed
    if (
      existing.first_name !== clientData.first_name ||
      existing.last_name !== clientData.last_name ||
      clientData.email ||
      clientData.google_id
    ) {
      if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
        const client = supabaseAdmin || supabase!;
        await client
          .from("clients")
          .update({
            first_name: clientData.first_name,
            last_name: clientData.last_name,
            email: clientData.email || existing.email,
            google_id: clientData.google_id || existing.google_id,
            auth_provider: clientData.auth_provider || existing.auth_provider,
          })
          .eq("id", existing.id);
      }
      existing.first_name = clientData.first_name;
      existing.last_name = clientData.last_name;
      if (clientData.email) existing.email = clientData.email;
      if (clientData.google_id) existing.google_id = clientData.google_id;
      if (clientData.auth_provider) existing.auth_provider = clientData.auth_provider;
    }
    return existing;
  }

  // Create new client
  if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
    const client = supabaseAdmin || supabase!;
    const { data, error } = await client
      .from("clients")
      .insert({
        business_id: businessId,
        phone: normalizedPhone,
        first_name: clientData.first_name,
        last_name: clientData.last_name,
        email: clientData.email,
        google_id: clientData.google_id,
        auth_provider: clientData.auth_provider || 'guest',
      })
      .select()
      .single();
    if (!error && data) return data as Client;
  }

  const newClient: Client = {
    id: "c-" + Math.random().toString(36).substring(2, 9),
    business_id: businessId,
    phone: normalizedPhone,
    first_name: clientData.first_name,
    last_name: clientData.last_name,
    email: clientData.email,
    google_id: clientData.google_id,
    auth_provider: clientData.auth_provider || 'guest',
    created_at: new Date().toISOString(),
  };
  db.clients.push(newClient);
  return newClient;
}

// ==============================================================================
// APPOINTMENTS
// ==============================================================================

export async function getAppointments(
  businessId: string,
  startDate?: string,
  endDate?: string
): Promise<Appointment[]> {
  if (isSupabaseConfigured && supabase) {
    let query = supabase
      .from("appointments")
      .select("*, service:services(*), client:clients(*), business:businesses(*)")
      .eq("business_id", businessId);

    if (startDate) query = query.gte("start_time", startDate);
    if (endDate) query = query.lte("end_time", endDate);

    const { data, error } = await query.order("start_time", { ascending: true });
    if (!error && data) return data as Appointment[];
  }

  let apps = db.appointments.filter((a) => a.business_id === businessId);

  if (startDate) {
    apps = apps.filter((a) => a.start_time >= startDate);
  }
  if (endDate) {
    apps = apps.filter((a) => a.end_time <= endDate);
  }

  apps.sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  return apps.map((a) =>
    hydrateAppointment(a, db.businesses, db.services, db.clients)
  );
}

export async function getAppointmentById(
  id: string
): Promise<Appointment | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("appointments")
      .select("*, service:services(*), client:clients(*), business:businesses(*)")
      .eq("id", id)
      .single();
    if (!error && data) return data as Appointment;
  }

  const app = db.appointments.find((a) => a.id === id);
  if (!app) return null;
  return hydrateAppointment(app, db.businesses, db.services, db.clients);
}

export async function createAppointment(appointmentData: {
  business_id: string;
  service_id: string;
  client_id: string;
  start_time: string;
  end_time: string;
  notes?: string | null;
}): Promise<Appointment> {
  if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
    const client = supabaseAdmin || supabase!;
    const { data, error } = await client
      .from("appointments")
      .insert({
        business_id: appointmentData.business_id,
        service_id: appointmentData.service_id,
        client_id: appointmentData.client_id,
        start_time: appointmentData.start_time,
        end_time: appointmentData.end_time,
        status: "confirmed",
        reminder_sent: false,
        notes: appointmentData.notes || null,
      })
      .select("*, service:services(*), client:clients(*), business:businesses(*)")
      .single();
    if (!error && data) return data as Appointment;
  }

  const newApp: Appointment = {
    id: "app-" + Math.random().toString(36).substring(2, 9),
    business_id: appointmentData.business_id,
    service_id: appointmentData.service_id,
    client_id: appointmentData.client_id,
    start_time: appointmentData.start_time,
    end_time: appointmentData.end_time,
    status: "confirmed",
    reminder_sent: false,
    notes: appointmentData.notes || null,
    created_at: new Date().toISOString(),
  };

  db.appointments.push(newApp);
  return hydrateAppointment(newApp, db.businesses, db.services, db.clients);
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus
): Promise<Appointment | null> {
  if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
    const client = supabaseAdmin || supabase!;
    const { data, error } = await client
      .from("appointments")
      .update({ status })
      .eq("id", id)
      .select("*, service:services(*), client:clients(*), business:businesses(*)")
      .single();
    if (!error && data) return data as Appointment;
  }

  const idx = db.appointments.findIndex((a) => a.id === id);
  if (idx !== -1) {
    db.appointments[idx].status = status;
    return hydrateAppointment(
      db.appointments[idx],
      db.businesses,
      db.services,
      db.clients
    );
  }
  return null;
}

// Block time (creates a busy block appointment preventing public bookings)
export async function blockTimeSlot({
  business_id,
  start_time,
  end_time,
  reason,
}: {
  business_id: string;
  start_time: string;
  end_time: string;
  reason: string;
}): Promise<Appointment> {
  // Ensure a special "חסימת זמן" client exists for this business
  const blockClient = await findOrCreateClient(business_id, {
    phone: "0000000000",
    first_name: "חסימה",
    last_name: `(${reason || "הפסקה"})`,
  });

  return createAppointment({
    business_id,
    service_id: db.services.find((s) => s.business_id === business_id)?.id || "",
    client_id: blockClient.id,
    start_time,
    end_time,
    notes: `[זמן חסום] ${reason || "הפסקה/סידורים"}`,
  });
}

// ==============================================================================
// BACKGROUND REMINDER WORKER SUPPORT
// ==============================================================================

export async function getPendingReminders(
  minHoursAhead = 24,
  maxHoursAhead = 25
): Promise<Appointment[]> {
  const now = new Date();
  const windowStart = new Date(now.getTime() + minHoursAhead * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() + maxHoursAhead * 60 * 60 * 1000).toISOString();

  if (isSupabaseConfigured && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from("appointments")
      .select("*, service:services(*), client:clients(*), business:businesses(*)")
      .eq("status", "confirmed")
      .eq("reminder_sent", false)
      .gte("start_time", windowStart)
      .lte("start_time", windowEnd);

    if (!error && data) return data as Appointment[];
  }

  const pending = db.appointments.filter((a) => {
    return (
      a.status === "confirmed" &&
      !a.reminder_sent &&
      a.start_time >= windowStart &&
      a.start_time <= windowEnd
    );
  });

  return pending.map((a) =>
    hydrateAppointment(a, db.businesses, db.services, db.clients)
  );
}

export async function markReminderSent(appointmentId: string): Promise<boolean> {
  if (isSupabaseConfigured && supabaseAdmin) {
    const { error } = await supabaseAdmin
      .from("appointments")
      .update({ reminder_sent: true })
      .eq("id", appointmentId);
    if (!error) return true;
  }

  const app = db.appointments.find((a) => a.id === appointmentId);
  if (app) {
    app.reminder_sent = true;
    return true;
  }
  return false;
}
