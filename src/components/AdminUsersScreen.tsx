"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Plus, X } from "lucide-react";
import { CreateUserForm, type Role, type UserRow } from "./UserTable";
import { MenuButton } from "@/components/MenuButton";
import { focusRing } from "@/lib/ui";

// تسميات الأدوار في التصميم تطابق شارات "مدير / محرر / قارئ" هنا؛ الجدول على
// سطح المكتب يستخدم "مشاهد" بدل "قارئ" — فرق تسمية موجود مسبقاً، أُبقيه كما هو
// هناك ولا أغيّره ضمن نطاق إعادة تصميم الموبايل هذه.
const MOBILE_ROLE_LABELS: Record<Role, string> = { ADMIN: "مدير", EDITOR: "محرر", VIEWER: "قارئ" };

/** شاشة «إدارة المستخدمين» الغامرة على الموبايل: بطاقات بدل جدول، زرّ عائم
 * لإنشاء حساب (لوح منبثق يعيد استخدام CreateUserForm). سطح المكتب دون تغيير. */
export function AdminUsersScreen({ initialUsers, currentUserId }: { initialUsers: UserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  async function updateUser(id: string, data: Partial<{ role: Role; isActive: boolean }>) {
    setBusyId(id);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setBusyId(null);
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updated } : u)));
    } else {
      alert("تعذر تحديث المستخدم");
    }
  }

  async function changePassword(id: string) {
    const password = prompt("كلمة المرور الجديدة (8 أحرف على الأقل):");
    if (password === null) return;
    setBusyId(id);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusyId(null);
    if (res.ok) alert("تم تغيير كلمة المرور");
    else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "تعذر تغيير كلمة المرور");
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#f7f7f4] text-[#14211c]">
      <header className="flex items-center gap-2 px-3 pb-3 pt-2">
        <button type="button" onClick={() => router.back()} aria-label="رجوع" className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#3c4a44] ${focusRing}`}>
          <ChevronRight className="h-[22px] w-[22px]" aria-hidden="true" />
        </button>
        <span className="text-xl font-extrabold">إدارة المستخدمين</span>
        <div className="flex-1" />
        <MenuButton />
      </header>

      <div className="flex-1 px-5 pb-24">
        <ul className="flex flex-col gap-3">
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            const busy = busyId === u.id;
            return (
              <li key={u.id} className={`rounded-2xl border border-[#e6e6e1] bg-white p-4 ${busy ? "opacity-50" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[17px] font-bold">{u.name}</div>
                    <div className="mt-0.5 truncate text-[13px] text-[#6b7670]">{u.email}</div>
                  </div>
                  <span
                    className={`h-7 shrink-0 rounded-full px-2.5 text-xs font-bold leading-7 ${
                      u.role === "ADMIN" ? "bg-[#ecfdf5] text-emerald-700" : "bg-[#f2f2ee] text-[#5c6660]"
                    }`}
                  >
                    {MOBILE_ROLE_LABELS[u.role]}
                  </span>
                </div>
                {!isSelf && (
                  <div className="mt-2.5 flex gap-2 border-t border-[#f0f0ec] pt-2.5">
                    <select
                      value={u.role}
                      disabled={busy}
                      aria-label={`دور ${u.name}`}
                      onChange={(e) => updateUser(u.id, { role: e.target.value as Role })}
                      className="h-10 flex-1 rounded-[11px] border border-[#e6e6e1] bg-white px-2 text-sm text-[#3c4a44]"
                    >
                      {(Object.keys(MOBILE_ROLE_LABELS) as Role[]).map((r) => (
                        <option key={r} value={r}>
                          {MOBILE_ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => changePassword(u.id)}
                      className="h-10 flex-1 rounded-[11px] border border-[#e6e6e1] bg-white text-sm text-[#3c4a44] disabled:opacity-50"
                    >
                      كلمة المرور
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => updateUser(u.id, { isActive: !u.isActive })}
                      className="h-10 flex-1 rounded-[11px] border border-[#e6e6e1] bg-white text-sm text-[#3c4a44] disabled:opacity-50"
                    >
                      {u.isActive ? "تعطيل" : "تفعيل"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="absolute bottom-7 start-5 inline-flex h-[60px] items-center gap-2 rounded-full bg-emerald-700 px-[22px] text-base font-semibold text-white shadow-[0_10px_24px_rgba(4,120,87,0.35)]"
      >
        <Plus className="h-[22px] w-[22px]" aria-hidden="true" />
        مستخدم جديد
      </button>

      {createOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="مستخدم جديد">
          <button type="button" aria-label="إغلاق" onClick={() => setCreateOpen(false)} className="absolute inset-0 bg-[#14211c]/30" />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white px-5 pb-8 pt-2.5 shadow-2xl">
            <span aria-hidden="true" className="mx-auto block h-1.5 w-11 rounded-full bg-neutral-200" />
            <div className="flex items-center justify-between py-3">
              <span className="text-lg font-extrabold">مستخدم جديد</span>
              <button type="button" onClick={() => setCreateOpen(false)} aria-label="إغلاق" className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 ${focusRing}`}>
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <CreateUserForm
              onCreated={(user) => {
                setUsers((prev) => [...prev, user]);
                setCreateOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
