"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Clock, X } from "lucide-react";
import type { Role, UserRow } from "./UserTable";
import { formatDate } from "@/lib/format";
import { btnDanger, btnPrimary, inputSm } from "@/lib/ui";

/**
 * طلبات الحسابات المُنشأة ذاتياً عبر Google وهي بانتظار موافقة الأدمن.
 * الموافقة تُفعّل الحساب بالدور المختار، والرفض يحذف الطلب نهائياً
 * (يستطيع صاحبه التقدّم من جديد عبر Google).
 */
export function PendingUsers({
  users,
  roleLabels,
  onApproved,
  onRejected,
}: {
  users: UserRow[];
  roleLabels: Record<Role, string>;
  onApproved: (id: string, updated: Partial<UserRow>) => void;
  onRejected: (id: string) => void;
}) {
  const router = useRouter();
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  if (users.length === 0) return null;

  async function approve(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isApproved: true, role: roles[id] ?? "VIEWER" }),
    });
    setBusyId(null);
    if (res.ok) {
      onApproved(id, await res.json());
      router.refresh(); // يحدّث شارة الطلبات في القائمة
    }
    else alert("تعذّرت الموافقة على الحساب");
  }

  async function reject(id: string) {
    if (!confirm("رفض هذا الطلب وحذفه؟")) return;
    setBusyId(id);
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (res.ok) {
      onRejected(id);
      router.refresh();
    }
    else alert("تعذّر رفض الطلب");
  }

  return (
    <section aria-labelledby="pending-users-title" className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 sm:p-6">
      <h2 id="pending-users-title" className="flex items-center gap-2 text-lg font-semibold text-amber-900">
        <Clock className="h-5 w-5" aria-hidden="true" />
        طلبات بانتظار الموافقة
        <span className="rounded-full bg-amber-200 px-2 text-sm font-bold leading-6 text-amber-900">{users.length}</span>
      </h2>
      <p className="mt-1 text-sm text-amber-800">حسابات أُنشئت عبر Google، ولا يمكن لأصحابها الدخول قبل موافقتك.</p>

      <ul className="mt-4 flex flex-col gap-3">
        {users.map((u) => {
          const busy = busyId === u.id;
          return (
            <li
              key={u.id}
              className={`flex flex-col gap-3 rounded-lg border border-amber-100 bg-white p-4 sm:flex-row sm:items-center ${busy ? "opacity-50" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-neutral-900">{u.name}</div>
                <div className="truncate text-sm text-neutral-500">
                  {u.email}
                </div>
                <div className="mt-0.5 text-xs text-neutral-400">طلب بتاريخ {formatDate(new Date(u.createdAt))}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={roles[u.id] ?? "VIEWER"}
                  disabled={busy}
                  aria-label={`دور ${u.name} بعد الموافقة`}
                  onChange={(e) => setRoles((prev) => ({ ...prev, [u.id]: e.target.value as Role }))}
                  className={`${inputSm} w-auto`}
                >
                  {(Object.keys(roleLabels) as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {roleLabels[r]}
                    </option>
                  ))}
                </select>
                <button type="button" disabled={busy} onClick={() => approve(u.id)} className={btnPrimary}>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  موافقة
                </button>
                <button type="button" disabled={busy} onClick={() => reject(u.id)} className={btnDanger}>
                  <X className="h-4 w-4" aria-hidden="true" />
                  رفض
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
