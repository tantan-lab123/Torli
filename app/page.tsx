import Link from "next/link";
import { ChevronLeft, MessageCircle, CalendarCheck, Smartphone, Phone } from "lucide-react";
import { getBusinesses } from "@/lib/db";
import { Logo, LogoMark } from "@/components/brand/Logo";

export const dynamic = "force-dynamic";

const keyPrimary =
  "m-key inline-flex items-center justify-center gap-2 h-[52px] px-6 rounded-lg bg-brand-600 text-white font-bold";
const keySecondary =
  "m-key2 inline-flex items-center justify-center gap-2 h-[52px] px-6 rounded-lg border border-ink-200 bg-white text-ink-900 font-bold";

export default async function HomePage() {
  const businesses = await getBusinesses();

  return (
    <div className="min-h-screen bg-paper text-ink-900">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-ink-200 px-4">
        <div className="max-w-5xl mx-auto h-16 flex items-center justify-between">
          <Logo sub="תורים בלי טלפונים" />
          <Link
            href="/admin"
            className="m-key2 inline-flex items-center h-11 px-4 rounded-lg border border-ink-200 bg-white text-sm font-bold text-ink-900"
          >
            כניסה לבעלי עסקים
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-10 pb-12 grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-center">
        <div className="space-y-5 text-right">
          <span className="inline-flex items-center gap-1.5 bg-lime text-lime-ink px-2.5 py-1 rounded text-xs font-bold">
            למספרות, קוסמטיקה וקליניקות
          </span>
          <h1 className="text-[34px] sm:text-5xl font-extrabold leading-[1.1] tracking-tight">
            הלקוחות קובעים לבד,
            <br />
            <span className="text-brand-600">אתה חוזר לעבוד.</span>
          </h1>
          <p className="text-base sm:text-lg text-ink-700 leading-relaxed max-w-md">
            קישור אחד בוואטסאפ ובאינסטגרם. הלקוח בוחר שירות ושעה, מקבל אישור עם קישור לשינוי או
            ביטול, ואתה רואה הכל ביומן בטלפון.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/admin" className={keyPrimary}>
              <span>פתיחת יומן לעסק</span>
              <ChevronLeft className="w-4 h-4 text-lime" />
            </Link>
            {businesses[0] && (
              <Link href={`/${businesses[0].slug}`} className={keySecondary}>
                איך זה נראה ללקוח
              </Link>
            )}
          </div>
        </div>

        {/* The ticket: what the owner sees on the phone */}
        <div className="relative mx-auto w-full max-w-[340px]" aria-hidden="true">
          <div className="rounded-2xl border border-ink-200 bg-white p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="font-extrabold">בוקר טוב, דני</span>
              <span className="text-ink-500">יום חמישי · 11:20</span>
            </div>
            <div className="m-print m-ticket rounded-xl bg-lime text-lime-ink border border-lime-edge flex [--notch:#FFFDF9]">
              <div className="flex-1 p-4 space-y-0.5">
                <div className="text-xs font-bold">התור הבא · בעוד 10 דק׳</div>
                <div className="text-lg font-extrabold">אבי מזרחי</div>
                <div className="text-sm">תספורת גבר · דני</div>
              </div>
              <div className="px-4 flex flex-col items-center justify-center border-r-2 border-dashed border-lime-ink/25">
                <span className="text-3xl font-extrabold leading-none">11:30</span>
              </div>
            </div>
            {[
              ["12:00", "נועה לוי", "תספורת ופן · מיכל", "bg-staff-m"],
              ["12:15", "רוני כהן", "תספורת וזקן · דני", "bg-staff-d"],
              ["14:30", "הדס בן דוד", "צבע שורשים · מיכל", "bg-staff-m"],
            ].map(([t, n, d, c]) => (
              <div key={t} className="flex items-center gap-3 py-2 border-t border-ink-100">
                <span className="w-12 font-bold">{t}</span>
                <span className={`w-[3px] h-8 rounded ${c}`} />
                <span className="flex-1 leading-tight">
                  <span className="block font-semibold">{n}</span>
                  <span className="block text-xs text-ink-600">{d}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-ink-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-12 grid gap-8 md:grid-cols-3">
          {[
            {
              icon: Smartphone,
              title: "שולחים קישור",
              text: "קישור קבוע לעסק, לביו באינסטגרם, לסטטוס ולמדבקה על הדלת. בלי אפליקציה ללקוח.",
            },
            {
              icon: CalendarCheck,
              title: "הלקוח קובע לבד",
              text: "רואה רק שעות פנויות לפי משך השירות, ולא יכול לקבוע על שעה שכבר תפוסה.",
            },
            {
              icon: MessageCircle,
              title: "אתה רק מאשר",
              text: "התור נכנס ליומן מיד, עם כפתור וואטסאפ ללקוח. הלקוח יכול לשנות או לבטל עד הזמן שקבעת.",
            },
          ].map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="space-y-2 text-right">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-lg bg-brand-600 text-lime flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold text-ink-500">{i + 1}</span>
              </div>
              <h2 className="text-lg font-extrabold">{title}</h2>
              <p className="text-sm text-ink-700 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The message the client gets */}
      <section className="max-w-5xl mx-auto px-4 py-12 grid gap-8 md:grid-cols-2 md:items-center">
        <div className="space-y-3 text-right">
          <h2 className="text-2xl font-extrabold">מה הלקוח מקבל בסוף</h2>
          <p className="text-ink-700 leading-relaxed">
            פתק תור ברור: מתי, מה ואיפה. כפתור להוספה ליומן, וקישור לשינוי או ביטול. בלי הרשמה ובלי
            סיסמה.
          </p>
        </div>
        <div
          className="m-ticket mx-auto w-full max-w-[340px] rounded-xl border border-ink-200 bg-white p-5 space-y-3 text-sm [--notch:#F4F1E8]"
          aria-hidden="true"
        >
          <div className="border-b border-dashed border-ink-300 pb-3">
            <div className="text-xs font-semibold text-ink-600">סטודיו דני</div>
            <div className="text-lg font-extrabold">צבע שורשים</div>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-600">תאריך</span>
            <span className="font-bold">יום ראשון, 11 באוקטובר</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-ink-600">שעה</span>
            <span className="font-extrabold text-lg bg-lime px-2 rounded">11:00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-600">אצל</span>
            <span className="font-bold">מיכל</span>
          </div>
        </div>
      </section>

      {/* Demo businesses */}
      {businesses.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pb-16">
          <div className="text-right mb-4">
            <h2 className="text-xl font-extrabold">לנסות כמו לקוח</h2>
            <p className="text-sm text-ink-600">בוחרים עסק וקובעים תור לדוגמה</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {businesses.map((b) => (
              <Link
                key={b.id}
                href={`/${b.slug}`}
                className="m-press group rounded-xl border border-ink-200 bg-white p-4 flex items-center gap-3 hover:border-brand-400"
              >
                <span className="w-11 h-11 rounded-lg bg-brand-600 text-lime text-lg font-extrabold flex items-center justify-center flex-none">
                  {b.name.trim().charAt(0)}
                </span>
                <span className="flex-1 min-w-0 text-right">
                  <span className="block font-extrabold truncate">{b.name}</span>
                  <span className="flex items-center gap-1.5 text-xs text-ink-600">
                    <Phone className="w-3.5 h-3.5" />
                    <span dir="ltr">{b.owner_phone}</span>
                  </span>
                </span>
                <ChevronLeft className="w-5 h-5 text-ink-400 group-hover:text-brand-600" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-ink-200 bg-white py-6 text-sm text-ink-600">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <LogoMark size={20} />
            <span>Torli · תורים לעסקים קטנים בישראל</span>
          </span>
          <Link href="/admin" className="font-semibold text-brand-600 hover:underline">
            כניסה לבעלי עסקים
          </Link>
        </div>
      </footer>
    </div>
  );
}
