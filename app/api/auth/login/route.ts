import { NextRequest, NextResponse } from "next/server";
import { loginBusiness } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if Google Sign-In
    if (body.provider === "google") {
      const { email, googleId } = body;
      if (!email && !googleId) {
        return NextResponse.json(
          { error: "חסרים פרטי התחברות של Google" },
          { status: 400 }
        );
      }

      const business = await loginBusiness({
        email,
        googleId,
      });

      if (!business) {
        return NextResponse.json(
          { error: "לא נמצא חשבון מקושר ל-Google זה" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        business,
      });
    }

    // Credentials login (phone + password or legacy pin)
    const { phone, password, pin } = body;
    const credentialKey = password || pin;

    if (!phone || !credentialKey) {
      return NextResponse.json(
        { error: "יש להזין מספר טלפון וסיסמה" },
        { status: 400 }
      );
    }

    const business = await loginBusiness({
      phone,
      pinOrPassword: credentialKey,
    });

    if (!business) {
      return NextResponse.json(
        { error: "מספר טלפון או סיסמה אינם נכונים" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      business,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "שגיאת שרת במהלך ההתחברות" },
      { status: 500 }
    );
  }
}
