import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import {
  addWaitlistEntry,
  getBusinessById,
  getServices,
  getWaitlist,
  setWaitlistStatus,
} from "@/lib/db";
import { requireRole, ANY_ROLE } from "@/lib/access";
import { clientIp, rateLimit, tooMany } from "@/lib/rateLimit";
import { israelDateString } from "@/lib/booking/slotGenerator";
import { notifyBusiness } from "@/lib/push";

export const dynamic = "force-dynamic";

const joinSchema = z.object({
  business_id: z.string().min(1).max(64),
  service_id: z.string().min(1).max(64),
  phone: z
    .string()
    .max(30)
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 10 && v.startsWith("0"), { message: "מספר טלפון לא תקין (10 ספרות)" }),
  first_name: z.string().trim().min(2, "יש להזין שם פרטי").max(60),
  last_name: z.string().trim().min(2, "יש להזין שם משפחה").max(60),
  desired_date: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, "תאריך לא תקין"),
});

/** Public: a customer asks to be told if a slot frees up on a full day. */
export async function POST(request: NextRequest) {
  try {
    if (!rateLimit(`waitlist:${clientIp(request)}`, 10, 60 * 60 * 1000)) return tooMany();

    const parsed = joinSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "נתונים שגויים" }, { status: 400 });
    }
    const d = parsed.data;
    if (!rateLimit(`waitlist:phone:${d.phone}`, 5, 60 * 60 * 1000)) return tooMany();

    const business = await getBusinessById(d.business_id);
    if (!business) return NextResponse.json({ error: "עסק לא נמצא" }, { status: 404 });
    if (business.settings?.waiting_list_enabled === false) {
      return NextResponse.json({ error: "רשימת ההמתנה אינה פעילה בעסק זה" }, { status: 403 });
    }
    const service = (await getServices(d.business_id)).find((s) => s.id === d.service_id);
    if (!service) return NextResponse.json({ error: "שירות לא נמצא" }, { status: 404 });

    // desired day must be today or later (Israel) and inside the booking window
    const today = israelDateString(new Date());
    const maxDays = business.settings?.max_future_days ?? 365;
    const limit = israelDateString(new Date(Date.now() + maxDays * 86_400_000));
    if (d.desired_date < today || d.desired_date > limit) {
      return NextResponse.json({ error: "תאריך לא תקין" }, { status: 400 });
    }

    const { duplicate } = await addWaitlistEntry({
      business_id: d.business_id,
      service_id: d.service_id,
      phone: d.phone,
      first_name: d.first_name,
      last_name: d.last_name,
      desired_date: d.desired_date,
    });

    if (!duplicate) {
      after(() =>
        notifyBusiness(d.business_id, {
          title: "לקוח נוסף לרשימת ההמתנה",
          body: `${d.first_name} ${d.last_name} · ${service.name} · ${d.desired_date}`,
          url: "/admin",
        })
      );
    }
    return NextResponse.json({ success: true, duplicate });
  } catch (error) {
    console.error("Error joining waitlist:", error);
    return NextResponse.json({ error: "שגיאה בהצטרפות לרשימת ההמתנה" }, { status: 500 });
  }
}

/** Team only. */
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ANY_ROLE);
  if (auth.error) return auth.error;
  return NextResponse.json(await getWaitlist(auth.session.businessId));
}

/** Team only: mark an entry handled / remove it. */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireRole(request, ANY_ROLE);
    if (auth.error) return auth.error;
    const body = await request.json();
    if (typeof body?.id !== "string" || (body.status !== "done" && body.status !== "cancelled")) {
      return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
    }
    const ok = await setWaitlistStatus(body.id, auth.session.businessId, body.status);
    return NextResponse.json({ success: ok }, { status: ok ? 200 : 404 });
  } catch (error) {
    console.error("Error updating waitlist:", error);
    return NextResponse.json({ error: "שגיאה בעדכון" }, { status: 500 });
  }
}
