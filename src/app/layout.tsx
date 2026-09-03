import type { Metadata, Viewport } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { RouteProgress } from "@/components/RouteProgress";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { getCurrentUser } from "@/lib/session";
import { LYRICS_SCALE_NO_FLASH_SCRIPT } from "@/lib/lyrics-font";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: "أناشيد - إدارة الأناشيد العربية",
  description: "منصة لإدارة وحفظ الأناشيد العربية",
  applicationName: "أناشيد",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "أناشيد",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#047857",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUser();

  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <head>
        {/* يطبّق حجم خط الأناشيد المحفوظ قبل الرسم لمنع وميض تغيّر الحجم. */}
        <script dangerouslySetInnerHTML={{ __html: LYRICS_SCALE_NO_FLASH_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-neutral-50 font-sans text-neutral-900 antialiased">
        <RouteProgress />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:z-50 focus:rounded-lg focus:bg-emerald-700 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          تخطَّ إلى المحتوى
        </a>
        <Navbar user={session} />
        <main id="main" className="mx-auto max-w-5xl px-2 py-6 sm:px-4">
          {children}
        </main>
        <ServiceWorkerRegister authenticated={!!session} />
      </body>
    </html>
  );
}
