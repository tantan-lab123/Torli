import { NextRequest, NextResponse } from "next/server";
import { getBusinessBySlug, getAppointments } from "@/lib/db";
import { Appointment } from "@/lib/types";

export const dynamic = "force-dynamic";

// Helper to format ISO date string into iCalendar format (YYYYMMDDTHHmmssZ)
function toIcsDate(isoString: string): string {
  const d = new Date(isoString);
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

// Clean text for iCalendar description
function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    const business = await getBusinessBySlug(slug);

    if (!business) {
      return new NextResponse("Business not found", { status: 404 });
    }

    const appointments = await getAppointments(business.id);
    const confirmedApps = appointments.filter((a: Appointment) => a.status === "confirmed");

    const nowIcs = toIcsDate(new Date().toISOString());

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Torli//Appointment Scheduler//HE",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${escapeIcsText(business.name)} - תורים`,
      "X-WR-TIMEZONE:Asia/Jerusalem",
      "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
      "X-PUBLISHED-TTL:PT15M",
    ];

    for (const app of confirmedApps) {
      const startIcs = toIcsDate(app.start_time);
      const endIcs = toIcsDate(app.end_time);
      const clientName = app.client
        ? `${app.client.first_name} ${app.client.last_name}`
        : "לקוח";
      const serviceName = app.service?.name || "טיפול";
      const price = app.service?.price || 0;
      const phone = app.client?.phone || "";

      const summary = `${serviceName} - ${clientName}`;
      const description = `שם הלקוח: ${clientName}\\nטלפון: ${phone}\\nשירות: ${serviceName}\\nמחיר: ₪${price}\\nנקבע דרך מערכת Torli`;

      icsContent.push(
        "BEGIN:VEVENT",
        `UID:${app.id}@torli.app`,
        `DTSTAMP:${nowIcs}`,
        `DTSTART:${startIcs}`,
        `DTEND:${endIcs}`,
        `SUMMARY:${escapeIcsText(summary)}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${escapeIcsText(business.name)}`,
        "STATUS:CONFIRMED",
        "END:VEVENT"
      );
    }

    icsContent.push("END:VCALENDAR");

    const body = icsContent.join("\r\n");

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="${slug}-calendar.ics"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Calendar feed error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
