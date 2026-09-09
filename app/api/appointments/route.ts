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
import { addMinutes, isBefore, isAfter, parseISO } from "date-fns";

export const dynamic = "force-dynamic";

const bookingSchema = z.object({
  business_id: z.string().min(1, "חסר מזהה עסק"),
  service_id: z.string().min(1, "יש לבחור שירות"),
  phone: z.string().min(9, "מספר טלפון לא תקין"),
  first_name: z.string().min(2, "יש להזין שם פרטי"),
  last_name: z.string().min(2, "יש להזין שם משפחה"),
  email: z.string().email("כתובת אימייל לא תקינה").optional().or(z.literal("")),
  google_id: z.string().optional(),
  auth_provider: z.enum(["guest", "google"]).optional(),
  start_time: z.string().datetime("זמן לא תקין"),
  notes: z.string().optional(),
});

const blockSlotSchema = z.object({
  business_id: z.string().min(1),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  reason: z.string().default("הפסקה / סידורים"),
});

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const businessId = searchParams.get("business_id");
  const startDate = searchParams.get("start_date") || undefined;
  const endDate = searchParams.get("end_date") || undefined;

  if (!businessId) {
    return NextResponse.json(
      { error: "business_id parameter is required" },
      { status: 400 }
    );
  }

  const appointments = await getAppointments(businessId, startDate, endDate);
  return NextResponse.json(appointments);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if this is a block slot request from admin
    if (body.is_block) {
      const parsedBlock = blockSlotSchema.safeParse(body);
      if (!parsedBlock.success) {
        return NextResponse.json(
          { error: parsedBlock.error.issues[0]?.message || "נתונים שגויים לחסימת זמן" },
          { status: 400 }
        );
      }
      const blocked = await blockTimeSlot(parsedBlock.data);
      return NextResponse.json({ success: true, appointment: blocked });
    }

    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "נתונים שגויים בטופס" },
        { status: 400 }
      );
    }

    const {
      business_id,
      service_id,
      phone,
      first_name,
      last_name,
      email,
      google_id,
      auth_provider,
      start_time,
      notes,
    } = parsed.data;

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

    // Double-booking check: verify no overlapping active appointment exists
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

    // Upsert client
    const client = await findOrCreateClient(business_id, {
      phone,
      first_name,
      last_name,
      email: email || undefined,
      google_id: google_id || undefined,
      auth_provider: auth_provider || 'guest',
    });

    // Create appointment
    const appointment = await createAppointment({
      business_id,
      service_id,
      client_id: client.id,
      start_time,
      end_time: slotEndIso,
      notes,
    });

    return NextResponse.json({
      success: true,
      appointment,
      client,
    });
  } catch (error) {
    console.error("Error creating appointment:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת התור. אנא נסה שוב." },
      { status: 500 }
    );
  }
}
