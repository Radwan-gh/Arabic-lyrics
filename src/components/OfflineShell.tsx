"use client";

import Link from "next/link";
import { useRealLocation } from "@/hooks/use-real-location";
import { HomeScreen } from "@/components/HomeScreen";
import { HomeView } from "@/components/HomeView";
import { ReaderScreen } from "@/components/ReaderScreen";
import { ReaderView } from "@/components/ReaderView";
import { FavoritesScreen } from "@/components/FavoritesScreen";
import { FavoritesView } from "@/components/FavoritesView";
import { PlaylistsScreen } from "@/components/PlaylistsScreen";
import { PlaylistsView } from "@/components/PlaylistsView";
import { PlaylistReadView } from "@/components/PlaylistReadView";
import { OfflineEmptyState } from "@/components/OfflineEmptyState";
import { focusRing } from "@/lib/ui";

// ─────────────────────────────────────────────────────────────────────────────
// غلاف احتياطي داخلي فقط (لا رابط تصفّح إليه ولا واجهة خاصة به): عند انقطاع
// الشبكة يخدم الـ service worker هذه الصفحة (على مسارها الفعلي /offline) لأي
// تنقّل غير مخزَّن بعينه — مع بقاء المسار الحقيقي في شريط العنوان (راجع
// public/sw.js's navigationHandler). لأن التصيير على الخادم لم يحدث إطلاقًا
// هنا، نقرأ المسار الحقيقي من window.location عبر useRealLocation ونعرض نفس
// مكوّنات الصفحات الحقيقية (لا نسخة مرآة منفصلة) بمعطيات SSR فارغة (null) —
// فتقرأ من اللقطة المخزَّنة تلقائيًا (راجع hooks/use-offline-*).
// ─────────────────────────────────────────────────────────────────────────────

type Route =
  | { kind: "home" }
  | { kind: "detail"; id: string }
  | { kind: "favorites" }
  | { kind: "playlists" }
  | { kind: "playlist"; id: string }
  | { kind: "unsupported" };

function parseRoute(pathname: string): Route {
  if (pathname === "/" || pathname === "") return { kind: "home" };
  if (pathname === "/favorites") return { kind: "favorites" };
  if (pathname === "/playlists") return { kind: "playlists" };
  const playlist = pathname.match(/^\/playlists\/([^/]+)(?:\/view)?\/?$/);
  if (playlist) return { kind: "playlist", id: decodeURIComponent(playlist[1]) };
  const detail = pathname.match(/^\/lyrics\/([^/]+)\/?$/);
  if (detail) return { kind: "detail", id: decodeURIComponent(detail[1]) };
  return { kind: "unsupported" };
}

export function OfflineShell() {
  const location = useRealLocation();

  if (!location) return null; // لا window أثناء التصيير على الخادم — لحظة أولى فقط.

  const route = parseRoute(location.pathname);

  switch (route.kind) {
    case "home":
      return (
        <>
          <div className="sm:hidden">
            <HomeScreen ssr={null} />
          </div>
          <HomeView ssr={null} />
        </>
      );
    case "detail":
      return (
        <>
          <div className="sm:hidden">
            <ReaderScreen ssr={null} id={route.id} />
          </div>
          <ReaderView ssr={null} id={route.id} />
        </>
      );
    case "favorites":
      return (
        <>
          <div className="sm:hidden">
            <FavoritesScreen ssr={null} />
          </div>
          <FavoritesView ssr={null} />
        </>
      );
    case "playlists":
      return (
        <>
          <div className="sm:hidden">
            <PlaylistsScreen initial={null} />
          </div>
          <div className="hidden sm:block">
            <PlaylistsView initial={null} />
          </div>
        </>
      );
    case "playlist":
      return <PlaylistReadView id={route.id} ssr={null} />;
    default:
      return (
        <OfflineEmptyState>
          هذه الصفحة تحتاج اتصالاً بالإنترنت.
          <span className="mt-3 block">
            <Link href="/" className={`font-medium text-emerald-700 hover:underline ${focusRing}`}>
              ▸ الصفحة الرئيسية
            </Link>
          </span>
        </OfflineEmptyState>
      );
  }
}
