import { NextRequest, NextResponse } from "next/server";
import {
  getServices,
  createService,
  updateService,
  deleteService,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const businessId = searchParams.get("business_id");

  if (!businessId) {
    return NextResponse.json(
      { error: "business_id parameter is required" },
      { status: 400 }
    );
  }

  const services = await getServices(businessId);
  return NextResponse.json(services);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { business_id, name, duration_minutes, buffer_minutes, price } = body;

    if (!business_id || !name || !duration_minutes) {
      return NextResponse.json(
        { error: "חסרים שדות חובה (עסק, שם שירות, משך זמן)" },
        { status: 400 }
      );
    }

    const newService = await createService({
      business_id,
      name,
      duration_minutes: Number(duration_minutes),
      buffer_minutes: Number(buffer_minutes ?? 5),
      price: Number(price ?? 0),
    });

    return NextResponse.json(newService);
  } catch (error) {
    console.error("Error creating service:", error);
    return NextResponse.json({ error: "שגיאה ביצירת שירות" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "חסר מזהה שירות" }, { status: 400 });
    }

    const updated = await updateService(id, {
      ...(updates.name ? { name: updates.name } : {}),
      ...(updates.duration_minutes !== undefined
        ? { duration_minutes: Number(updates.duration_minutes) }
        : {}),
      ...(updates.buffer_minutes !== undefined
        ? { buffer_minutes: Number(updates.buffer_minutes) }
        : {}),
      ...(updates.price !== undefined ? { price: Number(updates.price) } : {}),
    });

    if (!updated) {
      return NextResponse.json({ error: "שירות לא נמצא" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating service:", error);
    return NextResponse.json({ error: "שגיאה בעדכון שירות" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "חסר מזהה שירות" }, { status: 400 });
  }

  const success = await deleteService(id);
  return NextResponse.json({ success });
}
