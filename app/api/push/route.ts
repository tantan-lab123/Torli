import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deletePushSubscription, savePushSubscription } from "@/lib/db";
import { requireRole, ANY_ROLE } from "@/lib/access";
import { getVapidPublicKey } from "@/lib/push";
import { rateLimit, tooMany } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const subSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
});

/** Team only: the public VAPID key the browser needs to subscribe. */
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ANY_ROLE);
  if (auth.error) return auth.error;
  return NextResponse.json({ publicKey: await getVapidPublicKey() });
}

/** Team only: register this device for new-appointment notifications. */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ANY_ROLE);
    if (auth.error) return auth.error;
    if (!rateLimit(`push-sub:${auth.session.businessId}`, 30, 60 * 60 * 1000)) return tooMany();

    const parsed = subSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "מנוי לא תקין" }, { status: 400 });
    // only real push services are accepted as endpoints (no internal URLs)
    if (new URL(parsed.data.endpoint).protocol !== "https:") {
      return NextResponse.json({ error: "מנוי לא תקין" }, { status: 400 });
    }

    await savePushSubscription({
      endpoint: parsed.data.endpoint,
      business_id: auth.session.businessId,
      staff_id: auth.session.staffId ?? null,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("push subscribe failed:", error);
    return NextResponse.json({ error: "שגיאה בהרשמה להתראות" }, { status: 500 });
  }
}

/** Team only: stop notifications on this device. */
export async function DELETE(request: NextRequest) {
  const auth = await requireRole(request, ANY_ROLE);
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => ({}));
  if (typeof body?.endpoint === "string") {
    await deletePushSubscription(body.endpoint, auth.session.businessId);
  }
  return NextResponse.json({ success: true });
}
