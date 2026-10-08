import { NextRequest, NextResponse } from "next/server";
import { getCustomerProfile } from "@/lib/db";
import { verifyGoogleAccessToken } from "@/lib/auth";
import { clientIp, rateLimit, tooMany } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * A customer signed in with Google gets back the details they saved on a previous booking.
 * Identity comes only from the verified Supabase access token (Authorization: Bearer ...).
 */
export async function GET(request: NextRequest) {
  if (!rateLimit(`profile:${clientIp(request)}`, 60, 10 * 60 * 1000)) return tooMany();

  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const identity = await verifyGoogleAccessToken(token);
  if (!identity) {
    return NextResponse.json({ error: "אימות Google נכשל" }, { status: 401 });
  }

  const profile = await getCustomerProfile(identity.id);
  return NextResponse.json({
    email: identity.email,
    profile: profile
      ? {
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
        }
      : null,
  });
}
