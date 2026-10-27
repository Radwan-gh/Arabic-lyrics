"use client";

import Link from "next/link";
import { Spinner } from "@/components/Spinner";
import { focusRing } from "@/lib/ui";

/**
 * ما تعرضه صفحة فُتحت دون اتصال قبل جاهزية بيانات الجهاز (قراءة لحظية من
 * IndexedDB)، أو حين لا يكون المطلوب محفوظًا عليه.
 */
export function OfflinePageFallback({ status }: { status: "loading" | "missing" }) {
  if (status === "loading") {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <Spinner label="جارٍ التحميل…" className="text-sm text-neutral-500" />
      </div>
    );
  }
  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-neutral-600">هذا المحتوى غير محفوظ على هذا الجهاز. اتصل بالإنترنت لعرضه.</p>
      <Link
        href="/"
        className={`rounded-full bg-emerald-700 px-5 py-2 text-sm font-medium text-white ${focusRing}`}
      >
        الرئيسية
      </Link>
    </div>
  );
}
