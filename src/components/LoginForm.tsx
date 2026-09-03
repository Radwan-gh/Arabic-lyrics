"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LogIn } from "lucide-react";
import { Spinner } from "./Spinner";
import { inputCls, btnPrimary } from "@/lib/ui";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="mx-auto max-w-sm">
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
  );
}
