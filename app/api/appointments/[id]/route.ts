import { NextRequest, NextResponse } from "next/server";
import { getAppointmentById, updateAppointmentStatus } from "@/lib/db";
import { getSessionBusinessId } from "@/lib/auth";
import { clientIp, rateLimit, tooMany } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const UUID_RE = /^[A-Za-z0-9-]{6,64}$/; // uuid in prod, short ids in mock mode

// The appointment id is an unguessable capability link (sent to the client by
// reminder). Public callers only get the minimum needed for the cancel page.
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const params = await ctx.params;
  if (!rateLimit(`appt-get:${clientIp(request)}`, 60, 10 * 60 * 1000)) return tooMany();
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: "התור לא נמצא" }, { status: 404 });
  }

  const a = await getAppointmentById(params.id);
  if (!a) return NextResponse.json({ error: "התור לא נמצא" }, { status: 404 });

  return NextResponse.json({
    id: a.id,
    status: a.status,
    start_time: a.start_time,
    end_time: a.end_time,
    business_id: a.business_id,
    service: a.service
      ? {
          name: a.service.name,
          duration_minutes: a.service.duration_minutes,
          price: a.service.price,
        }
      : undefined,
    business: a.business
      ? { name: a.business.name, slug: a.business.slug, owner_phone: a.business.owner_phone }
      : undefined,
    client: a.client
      ? { first_name: a.client.first_name, last_name: a.client.last_name }
      : undefined,
  });
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const params = await ctx.params;
    if (!rateLimit(`appt-patch:${clientIp(request)}`, 30, 10 * 60 * 1000)) return tooMany();
    if (!UUID_RE.test(params.id)) {
      return NextResponse.json({ error: "התור לא נמצא" }, { status: 404 });
    }

    const body = await request.json();
    const status = body.status;
    if (status !== "confirmed" && status !== "cancelled") {
      return NextResponse.json(
        { error: "סטטוס לא תקין (חייב להיות confirmed או cancelled)" },
        { status: 400 }
      );
    }

    const existing = await getAppointmentById(params.id);
    if (!existing) return NextResponse.json({ error: "התור לא נמצא" }, { status: 404 });

    const ownerId = getSessionBusinessId(request);
    const isOwner = ownerId !== null && ownerId === existing.business_id;

    // The capability link may only CANCEL. Re-confirming is an owner action.
    if (!isOwner && status !== "cancelled") {
      return NextResponse.json({ error: "אין הרשאה לפעולה זו" }, { status: 403 });
    }

    const updated = await updateAppointmentStatus(params.id, status);
    if (!updated) return NextResponse.json({ error: "התור לא נמצא" }, { status: 404 });

    return NextResponse.json({ success: true, appointment: { id: updated.id, status: updated.status } });
  } catch (error) {
    console.error("Error updating appointment status:", error);
    return NextResponse.json({ error: "שגיאה בעדכון סטטוס התור" }, { status: 500 });
  }
}
