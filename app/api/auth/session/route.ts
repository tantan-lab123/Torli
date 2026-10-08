import { NextRequest, NextResponse } from "next/server";
import { getBusinessById } from "@/lib/db";
import { getSessionBusinessId, toOwnerBusiness, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Returns the currently logged-in owner's business (from the signed cookie). */
export async function GET(request: NextRequest) {
  const bid = getSessionBusinessId(request);
  if (!bid) return unauthorized();
  const business = await getBusinessById(bid);
  if (!business) return unauthorized();
  return NextResponse.json({ business: toOwnerBusiness(business) });
}
