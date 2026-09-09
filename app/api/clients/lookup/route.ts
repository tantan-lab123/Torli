import { NextRequest, NextResponse } from "next/server";
import { findClientByPhone } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const businessId = searchParams.get("business_id");
  const phone = searchParams.get("phone");

  if (!businessId || !phone) {
    return NextResponse.json(
      { error: "business_id and phone parameters are required" },
      { status: 400 }
    );
  }

  const client = await findClientByPhone(businessId, phone);

  if (!client) {
    return NextResponse.json({ exists: false, client: null });
  }

  return NextResponse.json({
    exists: true,
    client: {
      id: client.id,
      phone: client.phone,
      first_name: client.first_name,
      last_name: client.last_name,
    },
  });
}
