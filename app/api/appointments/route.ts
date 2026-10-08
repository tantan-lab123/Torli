import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getAppointments,
  getBusinessById,
  getServices,
  findOrCreateClient,
  createAppointment,
  blockTimeSlot,
} from "@/lib/db";
import {
  addMinutes,
  addDays,
  isBefore,
  isAfter,
  parseISO,
  isSameDay,
  isSameWeek,
  isSameMonth,
} from "date-fns";
import { forbidden, getSessionBusinessId, unauthorized } from "@/lib/auth";
import { clientIp, rateLimit, tooMany } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const bookingSchema = z.object({
  business_id: z.string().min(1, "חסר מזהה עסק").max(64),
  service_id: z.string().min(1, "יש לבחור שירות").max(64),
  phone: z
    .string()
    .max(30)
    .transform((val) => val.replace(/\D/g, ""))
    .refine((val) => val.length === 10, {
      message: "מספר הטלפון חייב להכיל בדיוק 10 ספרות (לדוגמה: 0501234567)",
    })
    .refine((val) => val.startsWith("0"), {
      message: "מספר טלפון ישראלי חייב להתחיל בספרה 0",
    }),
  first_name: z.string().trim().min(2, "יש להזין שם פרטי").max(60),
  last_name: z.string().trim().min(2, "יש להזין שם משפחה").max(60),
  email: z.string().email("כתובת אימייל לא תקינה").max(254).optional().or(z.literal("")),
  start_time: z.string().datetime("זמן לא תקין"),
  notes: z.string().max(500, "ההערה ארוכה מדי").optional(),
});

const blockSlotSchema = z.object({
  business_id: z.string().min(1),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  reason: z.string().max(120).default("הפסקה / סידורים"),
});

/** Owner-only: the appointment book with client details. */
export async function GET(request: NextRequest) {
  const sessionId = getSessionBusinessId(request);
  if (!sessionId) return unauthorized();

  const { searchParams } = request.nextUrl;
  const businessId = searchParams.get("business_id");
  if (!businessId) {
    return NextResponse.json({ error: "business_id parameter is required" }, { status: 400 });
  }
  if (businessId !== sessionId) return forbidden();

  const appointments = await getAppointments(
    businessId,
    searchParams.get("start_date") || undefined,
    searchParams.get("end_date") || undefined
  );
  return NextResponse.json(appointments);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Owner blocks a time range
    if (body.is_block) {
      const sessionId = getSessionBusinessId(request);
      if (!sessionId) return unauthorized();
      const parsedBlock = blockSlotSchema.safeParse(body);
      if (!parsedBlock.success) {
        return NextResponse.json(
          { error: parsedBlock.error.issues[0]?.message || "נתונים שגויים לחסימת זמן" },
          { status: 400 }
        );
      }
      if (parsedBlock.data.business_id !== sessionId) return forbidden();
      if (!isBefore(parseISO(parsedBlock.data.start_time), parseISO(parsedBlock.data.end_time))) {
        return NextResponse.json({ error: "טווח זמן לא תקין" }, { status: 400 });
      }
      const blocked = await blockTimeSlot(parsedBlock.data);
      return NextResponse.json({ success: true, appointment: blocked });
    }

    // Public booking
    const ip = clientIp(request);
    if (!rateLimit(`book:ip:${ip}`, 10, 60 * 60 * 1000)) return tooMany();

    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "נתונים שגויים בטופס" },
        { status: 400 }
      );
    }
    const { business_id, service_id, phone, first_name, last_name, email, start_time, notes } =
      parsed.data;
    if (!rateLimit(`book:phone:${phone}`, 5, 60 * 60 * 1000)) return tooMany();

    const business = await getBusinessById(business_id);
    if (!business) {
      return NextResponse.json({ error: "עסק לא נמצא" }, { status: 404 });
    }

    const services = await getServices(business_id);
    const service = services.find((s) => s.id === service_id);
    if (!service) {
      return NextResponse.json({ error: "שירות לא נמצא" }, { status: 404 });
    }

    const totalMinutes = service.duration_minutes + (service.buffer_minutes || 0);
    const slotStart = parseISO(start_time);
    const slotEnd = addMinutes(slotStart, totalMinutes);
    const slotEndIso = slotEnd.toISOString();

    // Respect the business booking window (server-side, not only in the UI)
    const now = new Date();
    const minNoticeHours = business.settings?.min_notice_hours ?? 0;
    const maxFutureDays = business.settings?.max_future_days ?? 365;
    if (isBefore(slotStart, addMinutes(now, Math.round(minNoticeHours * 60)))) {
      return NextResponse.json({ error: "לא ניתן לקבוע תור למועד זה" }, { status: 400 });
    }
    if (isAfter(slotStart, addDays(now, maxFutureDays))) {
      return NextResponse.json({ error: "לא ניתן לקבוע תור רחוק כל כך קדימה" }, { status: 400 });
    }

    // Double-booking check (the DB exclusion constraint is the hard guarantee)
    const existing = await getAppointments(business_id);
    const collision = existing.some((app) => {
      if (app.status === "cancelled") return false;
      const appStart = parseISO(app.start_time);
      const appEnd = parseISO(app.end_time);
      return isBefore(appStart, slotEnd) && isAfter(appEnd, slotStart);
    });
    if (collision) {
      return NextResponse.json(
        { error: "השעה שנבחרה כבר נתפסה. אנא בחר מועד אחר." },
        { status: 409 }
      );
    }

    // Public guests are always "guest": identity fields are never trusted from the client.
    const client = await findOrCreateClient(business_id, {
      phone,
      first_name,
      last_name,
      email: email || undefined,
      auth_provider: "guest",
    });

    const clientActiveAppointments = existing.filter(
      (app) => app.client_id === client.id && app.status !== "cancelled"
    );

    const tooMuch = (limit: number, unit: string, count: number) =>
      limit > 0 && count >= limit
        ? NextResponse.json(
            { error: `הגעת למגבלת התורים המותרת ${unit} (${limit} ${limit === 1 ? "תור" : "תורים"}).` },
            { status: 400 }
          )
        : null;

    const dayLimit = tooMuch(
      business.settings?.max_appointments_per_day ?? 0,
      "ליום אחד",
      clientActiveAppointments.filter((a) => isSameDay(parseISO(a.start_time), slotStart)).length
    );
    if (dayLimit) return dayLimit;
    const weekLimit = tooMuch(
      business.settings?.max_appointments_per_week ?? 0,
      "לשבוע אחד",
      clientActiveAppointments.filter((a) =>
        isSameWeek(parseISO(a.start_time), slotStart, { weekStartsOn: 0 })
      ).length
    );
    if (weekLimit) return weekLimit;
    const monthLimit = tooMuch(
      business.settings?.max_appointments_per_month ?? 0,
      "לחודש",
      clientActiveAppointments.filter((a) => isSameMonth(parseISO(a.start_time), slotStart)).length
    );
    if (monthLimit) return monthLimit;

    const appointment = await createAppointment({
      business_id,
      service_id,
      client_id: client.id,
      start_time,
      end_time: slotEndIso,
      notes,
    });

    // Never echo other people's data back to a public caller.
    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        status: appointment.status,
        service: appointment.service,
        business: appointment.business
          ? { name: appointment.business.name, slug: appointment.business.slug }
          : undefined,
      },
      client: { first_name: client.first_name, last_name: client.last_name, email: client.email },
    });
  } catch (error: unknown) {
    // 23P01 = exclusion_violation: someone booked the same slot a moment earlier.
    if ((error as { code?: string })?.code === "23P01") {
      return NextResponse.json(
        { error: "השעה שנבחרה כבר נתפסה. אנא בחר מועד אחר." },
        { status: 409 }
      );
    }
    console.error("Error creating appointment:", error);
    return NextResponse.json({ error: "שגיאה ביצירת התור. אנא נסה שוב." }, { status: 500 });
  }
}
