"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import type { SessionPayload } from "@/lib/jwt";

// مسارات الشاشات الغامرة على الموبايل: بلا شريط تنقّل علوي ولا حشوة الحاوية
// المعتادة — كل شاشة تبني كرومها الخاص (شبيهًا بتطبيق أصلي). سطح المكتب (sm+)
// يبقى دائمًا على التخطيط المعتاد بغضّ النظر عن هذه القائمة.
const IMMERSIVE_MOBILE_ROUTES = [
  /^\/lyrics\/(?!new$)[^/]+$/,
  /^\/favorites$/,
  /^\/playlists$/,
  /^\/playlists\/[^/]+$/,
  /^\/discover$/,
  /^\/offline$/,
  /^\/p\/[^/]+$/,
];

function isImmersive(pathname: string): boolean {
  return IMMERSIVE_MOBILE_ROUTES.some((re) => re.test(pathname));
}

export function AppChrome({ user, children }: { user: SessionPayload | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const immersive = isImmersive(pathname);

  return (
    <>
      <div className={immersive ? "hidden sm:block" : ""}>
        <Navbar user={user} />
      </div>
      <main
        id="main"
        className={immersive ? "sm:mx-auto sm:max-w-5xl sm:px-4 sm:py-6" : "mx-auto max-w-5xl px-2 py-6 sm:px-4"}
      >
        {children}
      </main>
    </>
  );
}
