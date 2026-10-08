import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addClientsBulk, getClientById, getClients, updateClientNotes } from "@/lib/db";
import { forbidden, getSessionBusinessId, unauthorized } from "@/lib/auth";
import { normalizeIsraeliMobile } from "@/lib/validation";
import { rateLimit, tooMany } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const contactSchema = z.object({
  first_name: z.string().trim().max(60).default(""),
  last_name: z.string().trim().max(60).default(""),
  phone: z.union([z.string().max(40), z.number()]),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  birthday: z.string().trim().max(10).optional(),
  notes: z.string().trim().max(1000).optional(),
});

/** Owner only: the business's saved customers. */
export async function GET(request: NextRequest) {
  const businessId = getSessionBusinessId(request);
  if (!businessId) return unauthorized();
  return NextResponse.json(await getClients(businessId));
}

/** Owner only: add one customer or import many (phone contacts / vCard / CSV). */
export async function POST(request: NextRequest) {
  try {
    const businessId = getSessionBusinessId(request);
    if (!businessId) return unauthorized();
    if (!rateLimit(`client-import:${businessId}`, 30, 60 * 60 * 1000)) return tooMany();

    const body = await request.json();
    const list: unknown[] = Array.isArray(body?.contacts) ? body.contacts : [];
    if (list.length === 0 || list.length > 2000) {
      return NextResponse.json({ error: "יש לשלוח בין 1 ל-2000 אנשי קשר" }, { status: 400 });
    }

    const valid = [];
    let invalid = 0;
    for (const item of list) {
      const parsed = contactSchema.safeParse(item);
      const phone = parsed.success ? normalizeIsraeliMobile(parsed.data.phone) : null;
      if (!parsed.success || !phone) {
        invalid += 1;
        continue;
      }
      const { first_name, last_name, email, birthday, notes } = parsed.data;
      valid.push({
        first_name: first_name || "לקוח",
        last_name,
        phone,
        email: email || undefined,
        birthday: birthday && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(birthday) ? birthday : undefined,
        notes: notes || undefined,
      });
    }

    const { added, skipped } = await addClientsBulk(businessId, valid);
    return NextResponse.json({ success: true, added, skipped, invalid });
  } catch (error) {
    console.error("Error importing clients:", error);
    return NextResponse.json({ error: "שגיאה בהוספת הלקוחות" }, { status: 500 });
  }
}

/** Owner only: update a customer's internal notes. */
export async function PATCH(request: NextRequest) {
  try {
    const businessId = getSessionBusinessId(request);
    if (!businessId) return unauthorized();

    const body = await request.json();
    if (typeof body?.id !== "string" || typeof body?.notes !== "string" || body.notes.length > 2000) {
      return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
    }
    const client = await getClientById(body.id);
    if (!client) return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    if (client.business_id !== businessId) return forbidden();

    await updateClientNotes(client.id, body.notes);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json({ error: "שגיאה בעדכון הלקוח" }, { status: 500 });
  }
}
