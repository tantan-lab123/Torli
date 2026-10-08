import { NextRequest, NextResponse } from "next/server";
import { findClientByPhone } from "@/lib/db";
import { clientIp, rateLimit, tooMany } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Anti-enumeration: tight per-IP budget for phone lookups.
  if (!rateLimit(`lookup:${clientIp(request)}`, 15, 10 * 60 * 1000)) return tooMany();

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

  // Only what the booking form needs to pre-fill: no id, phone, or email.
  return NextResponse.json({
    exists: true,
    client: { first_name: client.first_name, last_name: client.last_name },
  });
}
