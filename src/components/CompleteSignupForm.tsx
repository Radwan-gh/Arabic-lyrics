"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserRound } from "lucide-react";
import { Spinner } from "./Spinner";
import { focusRing } from "@/lib/ui";
import { FULL_NAME_MAX, fullNameError } from "@/lib/full-name";

/** إكمال إنشاء الحساب بعد العودة من Google: الاسم الكامل إلزامي قبل إرسال الطلب للإدارة. */
export function CompleteSignupForm({ email }: { email: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const localError = fullNameError(name);
    if (localError) {
      setError(localError);
      return;
    }

    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/google/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      setLoading(false);
      const data = await res.json().catch(() => ({}));
      setError(data.error || "حدث خطأ ما");
      return;
    }

    router.replace("/login?status=pending");
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center gap-[22px] bg-canvas px-7 text-ink sm:mx-auto sm:min-h-0 sm:max-w-sm sm:bg-transparent sm:px-0 sm:py-10">
      <div className="flex flex-col items-start gap-2">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-[18px] bg-emerald-700 text-white">
          <UserRound className="h-[26px] w-[26px]" aria-hidden="true" />
        </span>
        <h1 className="mt-2 text-[28px] font-extrabold sm:text-2xl">إكمال إنشاء الحساب</h1>
        <p className="text-[15px] leading-[1.8] text-ink-4">
          اكتب اسمك الكامل كما تريد أن يظهر للإدارة. سيُفعَّل حسابك بعد موافقتها.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        {error && (
          <p id="full-name-error" role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-danger-strong">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-1.5 text-sm font-semibold text-ink-2">
          حساب Google
          <span className="flex h-[52px] items-center truncate rounded-2xl border border-line bg-fill-2 px-3.5 text-base font-normal text-ink-3">
            {email}
          </span>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-2">
          الاسم الكامل
          <input
            required
            autoFocus
            autoComplete="name"
            maxLength={FULL_NAME_MAX}
            placeholder="مثال: محمد أحمد الخطيب"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? "full-name-error" : undefined}
            className="h-[52px] w-full box-border rounded-2xl border border-line bg-surface px-3.5 text-base text-ink placeholder:text-ink-6 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className={`mt-1 inline-flex h-[54px] items-center justify-center rounded-2xl bg-emerald-700 text-[17px] font-bold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60 ${focusRing}`}
        >
          {loading ? <Spinner label="جارٍ الإرسال…" /> : "إرسال طلب إنشاء الحساب"}
        </button>
      </form>

      <Link href="/login" className={`self-start text-[15px] font-semibold text-accent ${focusRing}`}>
        إلغاء والعودة لتسجيل الدخول
      </Link>
    </div>
  );
}
