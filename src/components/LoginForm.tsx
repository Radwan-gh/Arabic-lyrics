"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Clock, Eye, EyeOff, LogIn } from "lucide-react";
import { Spinner } from "./Spinner";
import { BrandLogo } from "./BrandLogo";
import { inputCls, btnPrimary, focusRing } from "@/lib/ui";

// رسائل العودة من تدفّق Google (راجع api/auth/google/callback).
const GOOGLE_ERRORS: Record<string, string> = {
  google_cancelled: "تم إلغاء الدخول عبر Google.",
  google_failed: "تعذّر الدخول عبر Google، يرجى المحاولة مرة أخرى.",
  google_unverified: "البريد الإلكتروني لحساب Google غير مُتحقَّق منه.",
  google_disabled: "الدخول عبر Google غير مُفعَّل حالياً.",
  signup_expired: "انتهت صلاحية طلب إنشاء الحساب، يرجى المتابعة باستخدام Google من جديد.",
  disabled: "تم تعطيل هذا الحساب، يرجى التواصل مع الإدارة",
};

const PENDING_MESSAGE = "تم استلام طلب إنشاء حسابك عبر Google، وسيُفعَّل بعد موافقة الإدارة.";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const googleHref = `/api/auth/google?next=${encodeURIComponent(next)}`;
  const pending = searchParams.get("status") === "pending";
  const redirectError = GOOGLE_ERRORS[searchParams.get("error") ?? ""] ?? null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(redirectError);
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

    router.push(next);
    router.refresh();
  }

  return (
    <>
      {/* الموبايل: شاشة غامرة تتمركز عمودياً، تطابق التصميم. */}
      <div className="flex min-h-dvh flex-col justify-center gap-[22px] bg-[#f7f7f4] px-7 text-[#14211c] sm:hidden">
        <div className="flex flex-col items-start gap-2">
          <BrandLogo className="text-[44px] text-emerald-800" />
          <h1 className="mt-2 text-[28px] font-extrabold">أهلاً بك</h1>
          <p className="text-[15px] leading-[1.8] text-[#6b7670]">
            سجّل الدخول للوصول إلى مفضلتك ووصلاتك.{" "}
            {googleEnabled
              ? "ليس لديك حساب؟ أنشئه عبر Google ويُفعَّل بعد موافقة الإدارة."
              : "الحسابات يُنشئها مدير النظام."}
          </p>
        </div>

        {pending && <PendingNotice className="rounded-xl" />}

        {googleEnabled && (
          <>
            <GoogleButton href={googleHref} className="h-[54px] rounded-2xl border-[#e6e6e1] text-base" />
            <OrDivider />
          </>
        )}

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
        {pending && <PendingNotice className="mb-4 rounded-md" />}
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

          {googleEnabled && (
            <>
              <OrDivider />
              <GoogleButton href={googleHref} className="h-11 rounded-lg border-neutral-300 text-sm" />
              <p className="text-center text-xs leading-6 text-neutral-500">
                ليس لديك حساب؟ أنشئه عبر Google ويُفعَّل بعد موافقة الإدارة.
              </p>
            </>
          )}
        </form>
      </div>
    </>
  );
}

function PendingNotice({ className }: { className: string }) {
  return (
    <p role="status" className={`flex items-start gap-2 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800 ${className}`}>
      <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {PENDING_MESSAGE}
    </p>
  );
}

function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-neutral-400" aria-hidden="true">
      <span className="h-px flex-1 bg-neutral-200" />
      أو
      <span className="h-px flex-1 bg-neutral-200" />
    </div>
  );
}

/** رابط تنقّل كامل (لا Link) لأن الوجهة مسار API يحوّل إلى Google. */
function GoogleButton({ href, className }: { href: string; className: string }) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center gap-2.5 border bg-white font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 ${focusRing} ${className}`}
    >
      <GoogleLogo />
      المتابعة باستخدام Google
    </a>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
