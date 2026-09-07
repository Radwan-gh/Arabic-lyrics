"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, LogIn, Music } from "lucide-react";
import { Spinner } from "./Spinner";
import { inputCls, btnPrimary, focusRing } from "@/lib/ui";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "حدث خطأ ما");
      return;
    }

    router.push(searchParams.get("next") || "/");
    router.refresh();
  }

  return (
    <>
      {/* الموبايل: شاشة غامرة تتمركز عمودياً، تطابق التصميم. */}
      <div className="flex min-h-dvh flex-col justify-center gap-[22px] bg-[#f7f7f4] px-7 text-[#14211c] sm:hidden">
        <div className="flex flex-col items-start gap-2">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-[18px] bg-emerald-700 text-white">
            <Music className="h-[26px] w-[26px]" aria-hidden="true" />
          </span>
          <h1 className="mt-2 text-[28px] font-extrabold">أهلاً بك</h1>
          <p className="text-[15px] leading-[1.8] text-[#6b7670]">
            سجّل الدخول للوصول إلى مفضلتك ووصلاتك. الحسابات يُنشئها مدير النظام.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#3c4a44]">
            البريد الإلكتروني
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-[52px] w-full box-border rounded-2xl border border-[#e6e6e1] bg-white px-3.5 text-base text-[#14211c] placeholder:text-[#9aa39d] focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#3c4a44]">
            كلمة المرور
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-[52px] w-full box-border rounded-2xl border border-[#e6e6e1] bg-white px-3.5 pe-11 text-base text-[#14211c] focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                className={`absolute inset-y-0 end-3 my-auto inline-flex h-6 w-6 items-center justify-center text-[#9aa39d] ${focusRing}`}
              >
                {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
              </button>
            </div>
          </label>

          <button type="submit" disabled={loading} className="mt-1 inline-flex h-[54px] items-center justify-center rounded-2xl bg-emerald-700 text-[17px] font-bold text-white disabled:opacity-60">
            {loading ? <Spinner label="جارٍ الدخول…" /> : "دخول"}
          </button>
        </form>

        <Link href="/" className={`self-start text-[15px] font-semibold text-emerald-700 ${focusRing}`}>
          تصفح المجموعة دون تسجيل ←
        </Link>
      </div>

      {/* سطح المكتب: النموذج الحالي دون تغيير. */}
      <div className="mx-auto hidden max-w-sm sm:block">
        <h1 className="mb-4 text-xl font-bold">تسجيل الدخول</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            البريد الإلكتروني
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            كلمة المرور
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
          </label>

          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? (
              <Spinner label="جارٍ الدخول…" />
            ) : (
              <>
                <LogIn className="h-4 w-4" aria-hidden="true" />
                دخول
              </>
            )}
          </button>
        </form>
      </div>
    </>
  );
}
