import Link from "next/link";
import {
  Calendar,
  Clock,
  Sparkles,
  Smartphone,
  PhoneCall,
  MessageCircle,
  ChevronLeft,
  Settings,
} from "lucide-react";
import { getBusinesses } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const businesses = await getBusinesses();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base text-slate-900 tracking-tight block leading-tight">
                ScheduleSaaS
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                מערכת תורים מותאמת מובייל בעברית
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>כניסה לניהול (Admin)</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 pt-8 pb-12 text-center max-w-2xl mx-auto space-y-4">
        <Badge variant="default" className="px-3 py-1 text-xs">
          <Sparkles className="w-3.5 h-3.5 ml-1 text-indigo-600" />
          <span>Mobile-First SaaS MVP • Next.js 14 + Supabase</span>
        </Badge>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
          מערכת קביעת וניהול תורים
          <br />
          <span className="text-indigo-600 bg-gradient-to-l from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            למספרות, קליניקות ומכוני יופי
          </span>
        </h1>

        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          ממשק ישראלי מותאם 100% למובייל (`dir="rtl"`), חישוב תורים חכם בזמן אמת, מניעת
          הזמנות כפולות, זיהוי אוטומטי של לקוחות חוזרים, ולוח ניהול קל לתפעול ביד אחת.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/barber-dan">
            <Button size="lg" className="rounded-2xl shadow-lg shadow-indigo-600/25">
              <span>הדגמת הזמנת תור (Barber Dan)</span>
              <ChevronLeft className="w-4 h-4 mr-1" />
            </Button>
          </Link>
          <Link href="/admin">
            <Button size="lg" variant="outline" className="rounded-2xl">
              <span>לוח ניהול לבעל העסק</span>
            </Button>
          </Link>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 space-y-2 border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">100% מותאם מובייל</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              עיצוב נקי עם מגירות תחתיות (Bottom Sheets), יעדי לחיצה נוחים, וחוויית שימוש
              המרגישה כמו אפליקציה מותקנת ללא צורך בהורדה.
            </p>
          </Card>

          <Card className="p-5 space-y-2 border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">חישוב זמנים ומניעת כפילויות</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              מחשב תורים לפי שעות הפעילות, משך השירות וזמן המנוחה (Buffer) בין הטיפולים,
              וחוסם תורים חופפים.
            </p>
          </Card>

          <Card className="p-5 space-y-2 border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">שילוב וואטסאפ ויומנים</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              הוספה ישירה ליומן Google ו-Apple (.ics), קישור ייעודי לביטול מהיר, ולחצני חיוג
              ו-WhatsApp מהירים לבעל העסק.
            </p>
          </Card>
        </div>
      </section>

      {/* Available Demo Businesses */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="text-right mb-4">
          <h2 className="text-xl font-bold text-slate-900">עסקים להדגמה במערכת</h2>
          <p className="text-xs text-slate-500">
            בחר עסק כדי לחוות את תהליך ההזמנה הציבורי של הלקוח
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {businesses.map((b) => (
            <Card
              key={b.id}
              className="p-5 flex flex-col justify-between hover:border-indigo-300 transition-all shadow-soft"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="success">זמין לקביעת תור</Badge>
                  <span className="text-xs text-slate-400 font-mono">/{b.slug}</span>
                </div>

                <h3 className="font-extrabold text-lg text-slate-900 mb-1">{b.name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-4">
                  <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                  <span>{b.owner_phone}</span>
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <Link href={`/${b.slug}`} className="block">
                  <Button className="w-full text-xs font-bold h-10">
                    <span>עבור להזמנת תור</span>
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  </Button>
                </Link>

                <Link href="/admin" className="block">
                  <Button variant="ghost" className="w-full text-xs text-slate-600 h-9">
                    <span>פתח ביומן ניהול</span>
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>ScheduleSaaS MVP • פותח עבור עסקים קטנים בישראל</span>
          <div className="flex items-center gap-4">
            <Link href="/admin" className="hover:text-indigo-600">
              ניהול יומן
            </Link>
            <a
              href="/api/cron/reminders?secret=schedule-cron-secret-key-123"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-600"
            >
              API תזכורות (Cron)
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
