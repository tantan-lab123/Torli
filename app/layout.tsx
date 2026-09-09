import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-rubik",
  display: "swap",
});

export const metadata: Metadata = {
  title: "מערכת תורים חכמה | Scheduling SaaS",
  description: "מערכת קביעת וניהול תורים מתקדמת ומותאמת למובייל עבור בעלי עסקים בישראל",
  applicationName: "ScheduleApp",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "תורים",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body className="font-sans antialiased bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
        <main className="min-h-screen flex flex-col">{children}</main>
      </body>
    </html>
  );
}
