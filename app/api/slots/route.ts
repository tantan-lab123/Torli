import { NextRequest, NextResponse } from "next/server";
import { getBusinessById, getServices, getAppointments } from "@/lib/db";
import { generateAvailableSlots } from "@/lib/booking/slotGenerator";
import {
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
} from "date-fns";
import { clientIp, rateLimit, tooMany } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!rateLimit(`slots:${clientIp(request)}`, 120, 10 * 60 * 1000)) return tooMany();

  const { searchParams } = request.nextUrl;
  const businessId = searchParams.get("business_id");
  const serviceId = searchParams.get("service_id");
  const dateParam = searchParams.get("date"); // YYYY-MM-DD
  const monthParam = searchParams.get("month"); // YYYY-MM

  if (!businessId || !serviceId || (!dateParam && !monthParam)) {
    return NextResponse.json(
      { error: "business_id, service_id, and at least date or month are required" },
      { status: 400 }
    );
  }

  if (
    (dateParam && !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateParam)) ||
    (monthParam && !/^[0-9]{4}-[0-9]{2}$/.test(monthParam))
  ) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  const business = await getBusinessById(businessId);
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const services = await getServices(businessId);
  const service = services.find((s) => s.id === serviceId);
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const stepMinutes = business.slot_interval_minutes || 15;

  // Case 1: Month is provided -> compute whole month availability map
  if (monthParam) {
    try {
      const monthStart = startOfMonth(parseISO(`${monthParam}-01`));
      const monthEnd = endOfMonth(monthStart);
      const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

      // padded by a day each side: business days are Israel wall-clock, the DB stores UTC
      const startISO = new Date(monthStart.getTime() - 36 * 3600 * 1000).toISOString();
      const endISO = new Date(monthEnd.getTime() + 60 * 3600 * 1000).toISOString();
      const monthAppointments = await getAppointments(businessId, startISO, endISO);

      const monthDays: Record<
        string,
        { hasSlots: boolean; count: number; isOpen: boolean; message?: string }
      > = {};

      for (const day of allDays) {
        const dayStr = format(day, "yyyy-MM-dd");
        // the generator checks real instant overlap, so no per-day string filtering is needed
        const dayApps = monthAppointments;
        const dayRes = generateAvailableSlots({
          business,
          service,
          selectedDate: day,
          existingAppointments: dayApps,
          stepMinutes,
        });

        monthDays[dayStr] = {
          hasSlots: dayRes.slots.length > 0,
          count: dayRes.slots.length,
          isOpen: dayRes.isOpenToday,
          message: dayRes.message,
        };
      }

      // If a specific dateParam was also requested, compute its detailed slots
      let selectedDateSlots: ReturnType<typeof generateAvailableSlots> = {
        slots: [],
        isOpenToday: true,
      };

      if (dateParam) {
        const targetDate = parseISO(dateParam);
        const targetApps = monthAppointments;
        selectedDateSlots = generateAvailableSlots({
          business,
          service,
          selectedDate: targetDate,
          existingAppointments: targetApps,
          stepMinutes,
        });
      }

      return NextResponse.json({
        monthDays,
        slots: selectedDateSlots.slots,
        isOpenToday: selectedDateSlots.isOpenToday,
        message: selectedDateSlots.message,
      });
    } catch (err) {
      console.error("Error generating month slots:", err);
      return NextResponse.json(
        { error: "Failed to generate month slots" },
        { status: 500 }
      );
    }
  }

  // Case 2: Only dateParam provided (backward compatibility)
  const selectedDate = parseISO(dateParam!);
  const startOfDay = new Date(selectedDate.getTime() - 36 * 3600 * 1000).toISOString();
  const endOfDay = new Date(selectedDate.getTime() + 60 * 3600 * 1000).toISOString();
  const appointments = await getAppointments(businessId, startOfDay, endOfDay);

  const result = generateAvailableSlots({
    business,
    service,
    selectedDate,
    existingAppointments: appointments,
    stepMinutes,
  });

  return NextResponse.json(result);
}
