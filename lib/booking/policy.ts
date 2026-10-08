import type { Business } from "@/lib/types";

/** Can a CUSTOMER still cancel / move an appointment, per the business "cancellation cutoff" setting? */
export function customerChangePolicy(
  business: Pick<Business, "settings"> | undefined,
  startIso: string,
  now: number = Date.now()
): { allowed: boolean; cutoffHours: number; reason?: string } {
  const cutoffHours = business?.settings?.cancellation_cutoff_hours ?? 6;
  const hoursLeft = (new Date(startIso).getTime() - now) / 3_600_000;
  if (hoursLeft <= 0) {
    return { allowed: false, cutoffHours, reason: "התור כבר התקיים או התחיל" };
  }
  if (hoursLeft < cutoffHours) {
    return {
      allowed: false,
      cutoffHours,
      reason: `לא ניתן לבטל או לשנות תור פחות מ-${cutoffHours} שעות לפני המועד. אנא צור קשר ישירות עם העסק.`,
    };
  }
  return { allowed: true, cutoffHours };
}
