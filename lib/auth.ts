import crypto from "crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Business } from "@/lib/types";

export const SESSION_COOKIE = "torli_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

const g = globalThis as unknown as { __TORLI_DEV_SECRET__?: string };
function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  // No dedicated secret: derive one from the server-only service-role key (never exposed to the browser).
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (svc && svc.length >= 32) {
    return crypto.createHash("sha256").update("torli-session-v1:" + svc).digest("hex");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET (>=32 chars) or SUPABASE_SERVICE_ROLE_KEY must be set in production");
  }
  // dev only: shared across route bundles so sessions survive hot reloads
  g.__TORLI_DEV_SECRET__ = g.__TORLI_DEV_SECRET__ || crypto.randomBytes(32).toString("hex");
  return g.__TORLI_DEV_SECRET__;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

// ---------------------------------------------------------------- sessions
export function createSessionToken(businessId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ bid: businessId, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  try {
    const { bid, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof bid !== "string" || typeof exp !== "number") return null;
    if (exp < Math.floor(Date.now() / 1000)) return null;
    return bid;
  } catch {
    return null;
  }
}

/** Returns the business id of the logged-in owner, or null. */
export function getSessionBusinessId(request: NextRequest): string | null {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export function setSessionCookie(res: NextResponse, businessId: string): void {
  res.cookies.set(SESSION_COOKIE, createSessionToken(businessId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export function unauthorized(message = "נדרשת התחברות") {
  return NextResponse.json({ error: message }, { status: 401 });
}
export function forbidden(message = "אין הרשאה לפעולה זו") {
  return NextResponse.json({ error: message }, { status: 403 });
}

// --------------------------------------------------------------- passwords
const BCRYPT_RE = /^\$2[aby]\$/;

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 11);
}

/** Verifies a password. Tolerates legacy plaintext rows (flagged via needsRehash). */
export function verifyPassword(
  plain: string,
  stored: string | null | undefined
): { ok: boolean; needsRehash: boolean } {
  if (!stored) return { ok: false, needsRehash: false };
  if (BCRYPT_RE.test(stored)) {
    return { ok: bcrypt.compareSync(plain, stored), needsRehash: false };
  }
  return { ok: safeEqual(plain, stored), needsRehash: true };
}

// ------------------------------------------------------------ calendar feed
export function calendarToken(businessId: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(`calendar:${businessId}`)
    .digest("hex")
    .slice(0, 40);
}
export function verifyCalendarToken(businessId: string, token: string | null): boolean {
  return !!token && safeEqual(token, calendarToken(businessId));
}

// ----------------------------------------------------- cron / shared secret
export function verifyBearer(request: NextRequest, secret: string | undefined): boolean {
  if (!secret || secret.length < 16) return false;
  const header = request.headers.get("authorization") || "";
  return safeEqual(header, `Bearer ${secret}`);
}

// ------------------------------------------------------ Google (via Supabase)
/** Verifies a Supabase Auth access token and returns the verified identity. */
export async function verifyGoogleAccessToken(
  accessToken: unknown
): Promise<{ email: string; id: string } | null> {
  if (typeof accessToken !== "string" || accessToken.length < 20) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(accessToken);
  const user = data?.user;
  if (error || !user?.email || !user.email_confirmed_at) return null;
  if (user.app_metadata?.provider !== "google") return null;
  return { email: user.email.toLowerCase(), id: user.id };
}

// -------------------------------------------------------------- sanitizers
/** Fields safe to show to anyone (public booking page). */
export function toPublicBusiness(b: Business): Business {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, pin, google_id, owner_email, calendar_token, ...rest } = b;
  return rest as Business;
}

/** Fields for the logged-in owner: never the password hash / pin / google id. */
export function toOwnerBusiness(b: Business): Business {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, pin, google_id, ...rest } = b;
  return { ...rest, calendar_token: calendarToken(b.id) } as Business;
}
