"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { PWAInstallFloating } from "@/components/PWAInstallButton";
import { MenuProvider } from "@/lib/menu-context";
import type { SessionPayload } from "@/lib/jwt";

// مسارات الشاشات الغامرة على الموبايل: بلا شريط تنقّل علوي ولا حشوة الحاوية
// المعتادة — كل شاشة تبني كرومها الخاص (شبيهًا بتطبيق أصلي). سطح المكتب (sm+)
// يبقى دائمًا على التخطيط المعتاد بغضّ النظر عن هذه القائمة.
const IMMERSIVE_MOBILE_ROUTES = [
  /^\/$/,
  /^\/lyrics\/[^/]+$/,
  /^\/favorites$/,
  /^\/playlists$/,
  /^\/playlists\/[^/]+$/,
  /^\/discover$/,
  /^\/p\/[^/]+$/,
  /^\/login$/,
  /^\/signup\/complete$/,
  /^\/admin\/users$/,
  /^\/admin\/tags$/,
];

function isImmersive(pathname: string): boolean {
  return IMMERSIVE_MOBILE_ROUTES.some((re) => re.test(pathname));
}

export function AppChrome({
  user,
  pendingUsers = 0,
  children,
}: {
  user: SessionPayload | null;
  pendingUsers?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const immersive = isImmersive(pathname);

  return (
    <MenuProvider>
      <Navbar user={user} pendingUsers={pendingUsers} compact={immersive} />
      <main
        id="main"
        className={immersive ? "sm:mx-auto sm:max-w-5xl sm:px-4 sm:py-6" : "mx-auto max-w-5xl px-2 py-6 sm:px-4"}
      >
        {children}
      </main>
      <PWAInstallFloating />
    </MenuProvider>
  );
}
