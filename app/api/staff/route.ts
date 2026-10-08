import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createStaff,
  deleteStaff,
  getBusinessByPhone,
  getStaffById,
  getStaffByBusiness,
  getStaffByPhone,
  updateStaff,
  type StaffMember,
} from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { requireRole, forgetStaffCache, ANY_ROLE, OWNER_ONLY } from "@/lib/access";
import { validatePassword } from "@/lib/utils";
import { isPasswordPwned, PWNED_ERROR } from "@/lib/pwned";
import { forbidden } from "@/lib/auth";
import { rateLimit, tooMany } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const PASSWORD_ERROR =
  "הסיסמה חייבת להכיל לפחות 8 תווים, אות גדולה, אות קטנה, ספרה ותו מיוחד (!@#$%^&* וכו')";

/** Never expose the hash; tell the UI whether this person can log in. */
function publicStaff(s: StaffMember) {
  return {
    id: s.id,
    business_id: s.business_id,
    name: s.name,
    phone: s.phone,
    role: s.role,
    is_visible_online: s.is_visible_online,
    avatar_color: s.avatar_color,
    active: s.active,
    has_login: !!s.password,
    created_at: s.created_at,
  };
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().max(30),
  role: z.enum(["manager", "staff"]).default("staff"),
  password: z.string().max(200).optional(),
  is_visible_online: z.boolean().optional(),
  avatar_color: z.string().max(40).optional(),
});

const updateSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(80).optional(),
  role: z.enum(["manager", "staff"]).optional(),
  is_visible_online: z.boolean().optional(),
  active: z.boolean().optional(),
  password: z.string().max(200).optional(),
  remove_login: z.boolean().optional(),
});

/** The whole team may see the employee list (needed for calendar filter / assignment). */
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ANY_ROLE);
  if (auth.error) return auth.error;
  const list = await getStaffByBusiness(auth.session.businessId);
  return NextResponse.json(list.map(publicStaff));
}

/** Owner only: add an employee, optionally with a login (phone + password). */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, OWNER_ONLY);
    if (auth.error) return auth.error;
    if (!rateLimit(`staff-create:${auth.session.businessId}`, 30, 60 * 60 * 1000)) return tooMany();

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "נתוני עובד לא תקינים" }, { status: 400 });
    }
    const d = parsed.data;
    const phone = d.phone.replace(/\D/g, "");
    if (phone.length !== 10 || !phone.startsWith("0")) {
      return NextResponse.json({ error: "מספר טלפון לא תקין (10 ספרות)" }, { status: 400 });
    }
    if ((await getStaffByPhone(phone)) || (await getBusinessByPhone(phone))) {
      return NextResponse.json({ error: "מספר הטלפון כבר רשום במערכת" }, { status: 409 });
    }

    let passwordHash: string | undefined;
    if (d.password) {
      if (!validatePassword(d.password).isValid) {
        return NextResponse.json({ error: PASSWORD_ERROR }, { status: 400 });
      }
      if (await isPasswordPwned(d.password)) {
        return NextResponse.json({ error: PWNED_ERROR }, { status: 400 });
      }
      passwordHash = hashPassword(d.password);
    }

    const staff = await createStaff({
      business_id: auth.session.businessId,
      name: d.name,
      phone,
      role: d.role,
      passwordHash,
      is_visible_online: d.is_visible_online,
      avatar_color: d.avatar_color,
    });
    return NextResponse.json(publicStaff(staff));
  } catch (error) {
    console.error("Error creating staff:", error);
    return NextResponse.json({ error: "שגיאה בהוספת העובד" }, { status: 500 });
  }
}

/** Owner only: rename, change role, hide, deactivate, set/reset/remove the login password. */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireRole(request, OWNER_ONLY);
    if (auth.error) return auth.error;

    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
    }
    const { id, password, remove_login, ...rest } = parsed.data;
    const existing = await getStaffById(id);
    if (!existing) return NextResponse.json({ error: "עובד לא נמצא" }, { status: 404 });
    if (existing.business_id !== auth.session.businessId) return forbidden();

    let passwordHash: string | null | undefined;
    if (remove_login) {
      passwordHash = null;
    } else if (password) {
      if (!validatePassword(password).isValid) {
        return NextResponse.json({ error: PASSWORD_ERROR }, { status: 400 });
      }
      if (await isPasswordPwned(password)) {
        return NextResponse.json({ error: PWNED_ERROR }, { status: 400 });
      }
      passwordHash = hashPassword(password);
    }

    const updated = await updateStaff(id, { ...rest, ...(passwordHash !== undefined ? { passwordHash } : {}) });
    forgetStaffCache(id);
    return NextResponse.json(updated ? publicStaff(updated) : { error: "עובד לא נמצא" });
  } catch (error) {
    console.error("Error updating staff:", error);
    return NextResponse.json({ error: "שגיאה בעדכון העובד" }, { status: 500 });
  }
}

/** Owner only. */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireRole(request, OWNER_ONLY);
    if (auth.error) return auth.error;
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "חסר מזהה עובד" }, { status: 400 });
    const existing = await getStaffById(id);
    if (!existing) return NextResponse.json({ success: true });
    if (existing.business_id !== auth.session.businessId) return forbidden();
    await deleteStaff(id);
    forgetStaffCache(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting staff:", error);
    return NextResponse.json({ error: "שגיאה במחיקת העובד" }, { status: 500 });
  }
}
