import { NextRequest, NextResponse } from "next/server";
import { getPendingReminders, markReminderSent } from "@/lib/db";
import { formatHebrewDate, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleReminders(request);
}

export async function POST(request: NextRequest) {
  return handleReminders(request);
}

async function handleReminders(request: NextRequest) {
  // Secret token authentication
  const authHeader = request.headers.get("authorization");
  const urlToken = request.nextUrl.searchParams.get("token") || request.nextUrl.searchParams.get("secret");

  const expectedSecret = process.env.CRON_SECRET || "schedule-cron-secret-key-123";

  const isAuthorized =
    authHeader === `Bearer ${expectedSecret}` ||
    urlToken === expectedSecret ||
    process.env.NODE_ENV === "development"; // allow easy preview in dev

  if (!isAuthorized) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing bearer token" },
      { status: 401 }
    );
  }

  try {
    // Query appointments starting between 24 and 25 hours from now with reminder_sent = false
    const pendingAppointments = await getPendingReminders(24, 25);

    const results = [];

    for (const app of pendingAppointments) {
      const client = app.client;
      const service = app.service;
      const business = app.business;

      if (!client || !client.phone) continue;

      const dateText = formatHebrewDate(app.start_time);
      const timeText = formatTime(app.start_time);
      const businessName = business?.name || "בית העסק";
      const serviceName = service?.name || "טיפול";

      // Formulate WhatsApp message in Hebrew
      const message =
        `היי ${client.first_name}! 🌟\n` +
        `תזכורת לתור שלך ל${serviceName} ב${businessName}.\n` +
        `🗓 מועד: ${dateText} בשעה ${timeText}.\n` +
        `לביטול או שינוי: ${process.env.NEXT_PUBLIC_APP_URL || "https://schedule.app"}/cancel/${app.id}\n` +
        `נשמח לראותך!`;

      // Log simulated WhatsApp gateway payload
      console.log("==================================================");
      console.log("SENDING REMINDER TO:", client.phone);
      console.log("CLIENT NAME:", `${client.first_name} ${client.last_name}`);
      console.log("MESSAGE:\n" + message);
      console.log("==================================================");

      // Mark reminder as sent
      await markReminderSent(app.id);

      results.push({
        appointment_id: app.id,
        phone: client.phone,
        client_name: `${client.first_name} ${client.last_name}`,
        service: serviceName,
        start_time: app.start_time,
        message,
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      processed_count: results.length,
      reminders_sent: results,
    });
  } catch (error) {
    console.error("Error running reminder cron:", error);
    return NextResponse.json(
      { error: "Internal server error running reminder cron" },
      { status: 500 }
    );
  }
}
