import type { ReactNode } from "react";

/** صندوق حالة فارغة مشترك (لا يوجد محتوى محفوظ، يلزم تسجيل الدخول، ...إلخ). */
export function OfflineEmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
      {children}
    </p>
  );
}
