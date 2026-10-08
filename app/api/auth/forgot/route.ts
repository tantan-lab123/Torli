import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { getBusinessesByEmail } from "@/lib/db";
import { clientIp, rateLimit, tooMany } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

/**
 * Step 1 of password recovery. If an owner account uses this email, Supabase Auth emails a
 * one-time sign-in link to /admin/reset (this proves the person controls the mailbox).
 * The answer is always the same, so nobody can probe which emails are registered.
 */
export async function POST(request: NextRequest) {
  const generic = NextResponse.json({
    success: true,
    message: "אם קיים חשבון עם האימייל הזה, נשלח אליו קישור לאיפוס הסיסמה.",
  });
  try {
    const ip = clientIp(request);
    if (!rateLimit(`forgot:ip:${ip}`, 5, 60 * 60 * 1000)) return tooMany();

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "כתובת אימייל לא תקינה" }, { status: 400 });
    }
    const { email } = parsed.data;
    if (!rateLimit(`forgot:email:${email}`, 3, 60 * 60 * 1000)) return generic;

    const matches = await getBusinessesByEmail(email);
    if (matches.length === 0) return generic;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return generic;

    const client = createClient(url, anon, { auth: { persistSession: false } });
    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${request.nextUrl.origin}/admin/reset`,
        shouldCreateUser: true,
      },
    });
    if (error) console.error("forgot-password email failed:", error.message);
    return generic;
  } catch (error) {
    console.error("forgot-password error:", error);
    return generic;
  }
}
