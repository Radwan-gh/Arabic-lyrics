"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Home,
  Compass,
  PlusCircle,
  Heart,
  ListMusic,
  Users,
  Tags,
  LogIn,
  LogOut,
  Menu,
  X,
  Music,
  User,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import type { SessionPayload } from "@/lib/jwt";
import { focusRing } from "@/lib/ui";
import { CLEAR_PRIVATE_MESSAGE } from "@/lib/offline";
import { PWAInstallButton } from "@/components/PWAInstallButton";

export function Navbar({ user }: { user: SessionPayload | null }) {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const router = useRouter();

  // Close the mobile menu when clicking/tapping anywhere outside the header,
  // pressing Escape, or resizing up to the desktop layout.
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function handleResize() {
      // Tailwind's `sm` breakpoint (640px) is where the desktop nav takes over.
      if (window.innerWidth >= 640) setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    // امسح البيانات الخاصة المخزَّنة للقراءة دون اتصال (المفضّلة/القوائم) حتى لا
    // تتسرّب إلى المستخدم التالي على جهاز مشترك.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.active?.postMessage({ type: CLEAR_PRIVATE_MESSAGE }))
        .catch(() => {});
    }
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className={`flex items-center gap-1.5 rounded-sm text-xl font-extrabold text-emerald-700 ${focusRing}`}
          onClick={() => setOpen(false)}
        >
          <Music className="h-5 w-5" aria-hidden="true" />
          أناشيد
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <PWAInstallButton />

          <button
            type="button"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-neutral-100 sm:hidden ${focusRing}`}
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
          </button>

          <nav className="hidden items-center gap-4 sm:flex">
            <NavLinks user={user} onLogout={handleLogout} />
          </nav>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          className="flex origin-top animate-nav-drop flex-col gap-1 border-t border-neutral-200 bg-white px-4 py-3 sm:hidden"
        >
          <NavLinks user={user} onLogout={handleLogout} mobile onNavigate={() => setOpen(false)} />
        </nav>
      )}
    </header>
  );
}

function NavLinks({
  user,
  onLogout,
  mobile,
  onNavigate,
}: {
  user: SessionPayload | null;
  onLogout: () => void;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const linkCls = mobile
    ? `flex items-center gap-2.5 rounded-md px-3 py-2.5 hover:bg-neutral-100 ${focusRing}`
    : `flex items-center gap-1.5 rounded-sm text-sm font-medium text-neutral-700 hover:text-emerald-700 ${focusRing}`;

  const iconCls = mobile ? "h-5 w-5 text-neutral-500" : "h-4 w-4";

  const NavItem = ({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) => (
    <Link href={href} className={linkCls} onClick={onNavigate}>
      <Icon className={iconCls} aria-hidden="true" />
      {label}
    </Link>
  );

  return (
    <>
      <NavItem href="/" icon={Home} label="الرئيسية" />
      <NavItem href="/discover" icon={Compass} label="الوصلات العامة" />
      <NavItem href="/offline" icon={WifiOff} label="دون اتصال" />
      {user && (user.role === "ADMIN" || user.role === "EDITOR") && (
        <NavItem href="/lyrics/new" icon={PlusCircle} label="إضافة أنشودة" />
      )}
      {user && <NavItem href="/favorites" icon={Heart} label="المفضلة" />}
      {user && <NavItem href="/playlists" icon={ListMusic} label="وصلاتي" />}
      {user?.role === "ADMIN" && <NavItem href="/admin/users" icon={Users} label="إدارة المستخدمين" />}
      {user?.role === "ADMIN" && <NavItem href="/admin/tags" icon={Tags} label="إدارة الوسوم" />}
      {user ? (
        <>
          {mobile && <span className="my-1 border-t border-neutral-200" aria-hidden="true" />}
          <span
            className={
              mobile
                ? "flex items-center gap-2 px-3 py-1 text-sm text-neutral-500"
                : "flex items-center gap-1.5 text-sm text-neutral-500"
            }
          >
            <User className="h-4 w-4" aria-hidden="true" />
            {user.name}
          </span>
          <button type="button" onClick={onLogout} className={`text-start ${linkCls}`}>
            <LogOut className={iconCls} aria-hidden="true" />
            تسجيل الخروج
          </button>
        </>
      ) : (
        <NavItem href="/login" icon={LogIn} label="تسجيل الدخول" />
      )}
    </>
  );
}
