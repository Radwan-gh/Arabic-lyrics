"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SessionPayload } from "@/lib/jwt";
import { focusRing } from "@/lib/ui";

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
          className={`rounded-sm text-xl font-extrabold text-emerald-700 ${focusRing}`}
          onClick={() => setOpen(false)}
        >
          أناشيد
        </Link>

        <button
          type="button"
          className={`inline-flex h-11 w-11 items-center justify-center rounded-md text-2xl leading-none text-neutral-600 transition-colors hover:bg-neutral-100 sm:hidden ${focusRing}`}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          {open ? "✕" : "☰"}
        </button>

        <nav className="hidden items-center gap-4 sm:flex">
          <NavLinks user={user} onLogout={handleLogout} />
        </nav>
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
    ? `rounded-md px-3 py-2.5 hover:bg-neutral-100 ${focusRing}`
    : `rounded-sm text-sm font-medium text-neutral-700 hover:text-emerald-700 ${focusRing}`;

  return (
    <>
      <Link href="/" className={linkCls} onClick={onNavigate}>
        الرئيسية
      </Link>
      <Link href="/discover" className={linkCls} onClick={onNavigate}>
        الوصلات العامة
      </Link>
      {user && (user.role === "ADMIN" || user.role === "EDITOR") && (
        <Link href="/lyrics/new" className={linkCls} onClick={onNavigate}>
          إضافة أنشودة
        </Link>
      )}
      {user && (
        <Link href="/favorites" className={linkCls} onClick={onNavigate}>
          المفضلة
        </Link>
      )}
      {user && (
        <Link href="/playlists" className={linkCls} onClick={onNavigate}>
          وصلاتي
        </Link>
      )}
      {user?.role === "ADMIN" && (
        <Link href="/admin/users" className={linkCls} onClick={onNavigate}>
          إدارة المستخدمين
        </Link>
      )}
      {user?.role === "ADMIN" && (
        <Link href="/admin/tags" className={linkCls} onClick={onNavigate}>
          إدارة الوسوم
        </Link>
      )}
      {user ? (
        <>
          {mobile && <span className="my-1 border-t border-neutral-200" aria-hidden="true" />}
          <span className={mobile ? "px-3 py-1 text-sm text-neutral-500" : "text-sm text-neutral-500"}>
            {user.name}
          </span>
          <button type="button" onClick={onLogout} className={`text-start ${linkCls}`}>
            تسجيل الخروج
          </button>
        </>
      ) : (
        <Link href="/login" className={linkCls} onClick={onNavigate}>
          تسجيل الدخول
        </Link>
      )}
    </>
  );
}
