import { NextRequest, NextResponse } from "next/server";
import { getBusinessById, getStaffById } from "@/lib/db";
import { getSession, toOwnerBusiness, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Returns the logged-in user's business and role (from the signed cookie). */
export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) return unauthorized();
  const business = await getBusinessById(session.businessId);
  if (!business) return unauthorized();

  let staff: { id: string; name: string } | undefined;
  if (session.staffId) {
    const s = await getStaffById(session.staffId);
    // a disabled / deleted staff member loses access immediately
    if (!s || !s.active || s.business_id !== business.id) return unauthorized();
    staff = { id: s.id, name: s.name };
  }
  return NextResponse.json({
    role: session.role,
    staff,
    business: toOwnerBusiness(business, session.role),
  });
}
