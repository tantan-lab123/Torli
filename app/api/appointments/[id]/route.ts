import { NextRequest, NextResponse } from "next/server";
import { getAppointmentById, updateAppointmentStatus } from "@/lib/db";
import { AppointmentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const appointment = await getAppointmentById(params.id);

  if (!appointment) {
    return NextResponse.json({ error: "התור לא נמצא" }, { status: 404 });
  }

  return NextResponse.json(appointment);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const status = body.status as AppointmentStatus;

    if (!status || !["confirmed", "cancelled"].includes(status)) {
      return NextResponse.json(
        { error: "סטטוס לא תקין (חייב להיות confirmed או cancelled)" },
        { status: 400 }
      );
    }

    const updated = await updateAppointmentStatus(params.id, status);

    if (!updated) {
      return NextResponse.json({ error: "התור לא נמצא" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      appointment: updated,
    });
  } catch (error) {
    console.error("Error updating appointment status:", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון סטטוס התור" },
      { status: 500 }
    );
  }
}
