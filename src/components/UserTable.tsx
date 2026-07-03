"use client";

import { useState } from "react";

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

  async function deleteUser(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا المستخدم؟ سيتم الاحتفاظ بالكلمات التي أضافها دون نسبها إليه.")) return;

    setBusyId(id);
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setBusyId(null);

    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } else {
      alert("تعذر حذف المستخدم");
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-neutral-50 text-neutral-500">
          <tr>
            <th className="px-4 py-3 text-start font-medium">الاسم</th>
            <th className="px-4 py-3 text-start font-medium">البريد الإلكتروني</th>
            <th className="px-4 py-3 text-start font-medium">الدور</th>
            <th className="px-4 py-3 text-start font-medium">الحالة</th>
            <th className="px-4 py-3 text-start font-medium">الكلمات</th>
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
                    onChange={(e) => updateUser(u.id, { role: e.target.value as Role })}
                    className="rounded-md border border-neutral-300 px-2 py-1"
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
                    onClick={() => updateUser(u.id, { isActive: !u.isActive })}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      u.isActive ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {u.isActive ? "مفعّل" : "معطّل"}
                  </button>
                )}
              </td>
              <td className="px-4 py-3">{u._count.lyrics}</td>
              <td className="px-4 py-3">
                {u.id !== currentUserId && (
                  <button
                    type="button"
                    disabled={busyId === u.id}
                    onClick={() => deleteUser(u.id)}
                    className="text-red-600 hover:underline"
                  >
                    حذف
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
