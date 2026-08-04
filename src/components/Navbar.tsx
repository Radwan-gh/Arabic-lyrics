"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SessionPayload } from "@/lib/jwt";

export function Navbar({ user }: { user: SessionPayload | null }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-extrabold text-emerald-700">
          كلمات
        </Link>

        <button
          type="button"
          className="rounded-md p-2 text-2xl leading-none text-neutral-600 hover:bg-neutral-100 sm:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="القائمة"
          aria-expanded={open}
        >
          ☰
        </button>

        <nav className="hidden items-center gap-4 sm:flex">
          <NavLinks user={user} onLogout={handleLogout} />
        </nav>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-neutral-200 bg-white px-4 py-3 sm:hidden">
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
    ? "rounded-md px-3 py-2 hover:bg-neutral-100"
    : "text-sm font-medium text-neutral-700 hover:text-emerald-700";

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
          إضافة كلمات
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
          <span className={mobile ? "px-3 py-1 text-sm text-neutral-500" : "text-sm text-neutral-500"}>
            {user.name}
          </span>
          <button type="button" onClick={onLogout} className={linkCls}>
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
