import { NextRequest, NextResponse } from "next/server";
import { getBusinesses, getBusinessBySlug, getBusinessById, updateBusiness } from "@/lib/db";
import { validatePassword, generateRandomSlug } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get("slug");
  const id = searchParams.get("id");

  if (slug) {
    const business = await getBusinessBySlug(slug);
    if (!business) {
      return NextResponse.json({ error: "עסק לא נמצא" }, { status: 404 });
    }
    return NextResponse.json(business);
  }

  if (id) {
    const business = await getBusinessById(id);
    if (!business) {
      return NextResponse.json({ error: "עסק לא נמצא" }, { status: 404 });
    }
    return NextResponse.json(business);
  }

  const businesses = await getBusinesses();
  return NextResponse.json(businesses);
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      owner_phone,
      owner_email,
      password,
      google_id,
      working_hours,
      slot_interval_minutes,
      date_overrides,
      settings,
      pin,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "חסר מזהה עסק" }, { status: 400 });
    }

    if (password) {
      const check = validatePassword(password);
      if (!check.isValid) {
        return NextResponse.json(
          {
            error:
              "הסיסמה חייבת להכיל לפחות 8 תווים, אות גדולה, אות קטנה, ספרה ותו מיוחד (!@#$%^&* וכו')",
          },
          { status: 400 }
        );
      }
    }

    const updated = await updateBusiness(id, {
      ...(name ? { name } : {}),
      ...(owner_phone ? { owner_phone } : {}),
      ...(owner_email ? { owner_email } : {}),
      ...(password ? { password } : {}),
      ...(google_id ? { google_id } : {}),
      ...(working_hours ? { working_hours } : {}),
      ...(slot_interval_minutes !== undefined
        ? { slot_interval_minutes: Number(slot_interval_minutes) }
        : {}),
      ...(date_overrides !== undefined ? { date_overrides } : {}),
      ...(settings !== undefined ? { settings } : {}),
      ...(pin ? { pin } : {}),
    });

    if (!updated) {
      return NextResponse.json({ error: "עסק לא נמצא" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating business:", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון פרטי העסק" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      slug,
      owner_phone,
      owner_email,
      password,
      google_id,
      category,
      slot_interval_minutes,
    } = body;

    let finalSlug = typeof slug === "string" ? slug.trim().toLowerCase().replace(/[^a-z0-9]/g, "") : "";
    if (!finalSlug) {
      finalSlug = generateRandomSlug(6);
    }

    if (!name || !owner_phone) {
      return NextResponse.json(
        { error: "יש למלא שם עסק ומספר טלפון" },
        { status: 400 }
      );
    }

    // Enforce password if not signing up via Google
    if (!password && !google_id) {
      return NextResponse.json(
        { error: "יש להגדיר סיסמה מאובטחת או להתחבר באמצעות חשבון Google" },
        { status: 400 }
      );
    }

    // If password provided, ensure it satisfies strong password policy
    if (password) {
      const check = validatePassword(password);
      if (!check.isValid) {
        return NextResponse.json(
          {
            error:
              "הסיסמה אינה עומדת בדרישות האבטחה: לפחות 8 תווים, אות גדולה, אות קטנה, ספרה ותו מיוחד",
          },
          { status: 400 }
        );
      }
    }

    // Check if slug already exists; if randomly generated and collision, re-roll once
    let existing = await getBusinessBySlug(finalSlug);
    if (existing && !slug) {
      finalSlug = generateRandomSlug(6);
      existing = await getBusinessBySlug(finalSlug);
    }

    if (existing) {
      return NextResponse.json(
        { error: "מזהה קישור (Slug) זה כבר תפוס במערכת. אנא בחר סיומת אחרת." },
        { status: 409 }
      );
    }

    const { createBusiness } = await import("@/lib/db");
    const newBusiness = await createBusiness({
      name,
      slug: finalSlug,
      owner_phone,
      owner_email,
      password,
      google_id,
      category,
      slot_interval_minutes: slot_interval_minutes
        ? Number(slot_interval_minutes)
        : undefined,
    });

    return NextResponse.json({ success: true, business: newBusiness });
  } catch (error) {
    console.error("Error creating business:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת עסק חדש" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {
        // ignore
      }
    }

    if (!id) {
      return NextResponse.json(
        { error: "חסר מזהה עסק למחיקה" },
        { status: 400 }
      );
    }

    const { deleteBusiness } = await import("@/lib/db");
    await deleteBusiness(id);

    return NextResponse.json({
      success: true,
      message: "העסק וכל הנתונים המקושרים אליו נמחקו לצמיתות בהצלחה",
    });
  } catch (error) {
    console.error("Error deleting business:", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת העסק מהמערכת" },
      { status: 500 }
    );
  }
}
