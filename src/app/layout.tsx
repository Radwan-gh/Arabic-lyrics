import type { Metadata, Viewport } from "next";
import { Scheherazade_New, Aref_Ruqaa } from "next/font/google";
import "./globals.css";
import { AppChrome } from "@/components/AppChrome";
import { RouteProgress } from "@/components/RouteProgress";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { LYRICS_SCALE_NO_FLASH_SCRIPT } from "@/lib/lyrics-font";
import { INSTALL_PROMPT_CAPTURE_SCRIPT } from "@/lib/install-prompt-script";
import { cookies } from "next/headers";
import { THEME_COOKIE, THEME_NO_FLASH_SCRIPT, isSiteTheme, themeClass } from "@/lib/theme";

// خطّ الموقع كله (الواجهة ونصوص الأناشيد): «شهرزاد الجديد» — خطّ نسخ أوضح للتشكيل.
// يُطبَّق افتراضيًا عبر font-sans على <body>، وتبقى font-naskh اسمًا مرادفًا له.
const scheherazade = Scheherazade_New({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-scheherazade",
});

// خطّ الرقعة للشعار الكتابي «نفحات» فقط (BrandLogo). يُطبَّق عبر أداة font-ruqaa.
const arefRuqaa = Aref_Ruqaa({
  subsets: ["arabic"],
  weight: ["700"],
  variable: "--font-ruqaa",
});

export const metadata: Metadata = {
  // الصفحات التي تحدّد عنوانها (مثل الوصلة المشتركة) يُلحق بها اسم التطبيق.
  title: { default: "نفحات - ديوان الإنشاد", template: "%s · نفحات" },
  description: "منصة لإدارة وحفظ الأناشيد العربية",
  applicationName: "نفحات",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "نفحات",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#047857",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUser();
  // عدد طلبات Google بانتظار الموافقة — للمدير فقط، ليظهر كشارة في القائمة.
  const pendingUsers =
    session?.role === "ADMIN" ? await prisma.user.count({ where: { isApproved: false } }).catch(() => 0) : 0;
  // مظهر العرض المحفوظ في الكوكي يُرسَل مع الصفحة نفسها، فتُرسم بمظهرها الصحيح من البداية.
  const savedTheme = (await cookies()).get(THEME_COOKIE)?.value;
  const themeCls = isSiteTheme(savedTheme) ? themeClass(savedTheme) : "";

  return (
    // suppressHydrationWarning: سكربت المظهر قد يعدّل صنف <html> قبل الـ hydration
    // (مظهر الجهاز حين لا اختيار محفوظ، أو صفحة مخزَّنة دون اتصال بمظهر قديم).
    <html
      lang="ar"
      dir="rtl"
      className={`${scheherazade.variable} ${arefRuqaa.variable} ${themeCls}`.trim()}
      suppressHydrationWarning
    >
      <head>
        {/* يطبّق مظهر العرض المحفوظ قبل الرسم (احتياطًا للصفحات المخزَّنة ولمظهر الجهاز). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_NO_FLASH_SCRIPT }} />
        {/* يطبّق حجم خط الأناشيد المحفوظ قبل الرسم لمنع وميض تغيّر الحجم. */}
        <script dangerouslySetInnerHTML={{ __html: LYRICS_SCALE_NO_FLASH_SCRIPT }} />
        {/* يلتقط حدث «تثبيت التطبيق» مبكرًا — قد يُطلَق قبل الـ hydration فيضيع. */}
        <script dangerouslySetInnerHTML={{ __html: INSTALL_PROMPT_CAPTURE_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-neutral-50 font-sans text-neutral-900 antialiased">
        <RouteProgress />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:z-50 focus:rounded-lg focus:bg-emerald-700 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          تخطَّ إلى المحتوى
        </a>
        <AppChrome user={session} pendingUsers={pendingUsers}>{children}</AppChrome>
        {/* الصفحات المخزَّنة تعكس المستخدم (اسمه ودوره في الواجهة)، فتُعرَّف الجلسة بها. */}
        <ServiceWorkerRegister sessionKey={session ? `${session.userId}:${session.role}:${session.name}` : null} />
      </body>
    </html>
  );
}
