"use client";

import { useState } from "react";
import { inputCls, inputSm, btnPrimary, focusRing } from "@/lib/ui";

type Role = "ADMIN" | "EDITOR" | "VIEWER";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  _count: { lyrics: number };
}

const ROLE_LABELS: Record<Role, string> = { ADMIN: "مدير", EDITOR: "محرر", VIEWER: "مشاهد" };

export function UserTable({ initialUsers, currentUserId }: { initialUsers: UserRow[]; currentUserId: string }) {
  const [users, setUsers] = useState(initialUsers);
  const [busyId, setBusyId] = useState<string | null>(null);

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

    if (res.ok) {
      alert("تم تغيير كلمة المرور");
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "تعذر تغيير كلمة المرور");
    }
  }

  async function deleteUser(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا المستخدم؟ سيتم الاحتفاظ بالأناشيد التي أضافها دون نسبها إليه.")) return;

    setBusyId(id);
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setBusyId(null);

    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } else {
      alert("تعذر حذف المستخدم");
    }
  }

  function handleCreated(user: UserRow) {
    setUsers((prev) => [...prev, user]);
  }

  return (
    <div className="flex flex-col gap-6">
      <CreateUserForm onCreated={handleCreated} />

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-3 text-start font-medium">الاسم</th>
              <th className="px-4 py-3 text-start font-medium">البريد الإلكتروني</th>
              <th className="px-4 py-3 text-start font-medium">الدور</th>
              <th className="px-4 py-3 text-start font-medium">الحالة</th>
              <th className="px-4 py-3 text-start font-medium">الأناشيد</th>
              <th className="px-4 py-3 text-start font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {users.map((u) => (
              <tr key={u.id} className={busyId === u.id ? "opacity-50" : ""}>
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3 text-neutral-500">{u.email}</td>
                <td className="px-4 py-3">
                  {u.id === currentUserId ? (
                    ROLE_LABELS[u.role]
                  ) : (
                    <select
                      value={u.role}
                      disabled={busyId === u.id}
                      aria-label={`دور ${u.name}`}
                      onChange={(e) => updateUser(u.id, { role: e.target.value as Role })}
                      className={`${inputSm} w-auto`}
                    >
                      {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.id === currentUserId ? (
                    <span className="text-emerald-700">مفعّل</span>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      aria-pressed={u.isActive}
                      onClick={() => updateUser(u.id, { isActive: !u.isActive })}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${focusRing} ${
                        u.isActive ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {u.isActive ? "مفعّل" : "معطّل"}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">{u._count.lyrics}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => changePassword(u.id)}
                      className={`rounded-sm text-emerald-700 hover:underline disabled:opacity-50 ${focusRing}`}
                    >
                      تغيير كلمة المرور
                    </button>
                    {u.id !== currentUserId && (
                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() => deleteUser(u.id)}
                        className={`rounded-sm text-red-600 hover:underline disabled:opacity-50 ${focusRing}`}
                      >
                        حذف
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreateUserForm({ onCreated }: { onCreated: (user: UserRow) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("VIEWER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "حدث خطأ ما");
      return;
    }

    const user = (await res.json()) as UserRow;
    onCreated(user);
    setName("");
    setEmail("");
    setPassword("");
    setRole("VIEWER");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold">إنشاء حساب جديد</h2>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          الاسم
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </label>

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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          الدور
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className={inputCls}
          >
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button type="submit" disabled={loading} className={`${btnPrimary} self-start`}>
        {loading ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
      </button>
    </form>
  );
}
