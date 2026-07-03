"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteLyricsButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("هل أنت متأكد من حذف هذه الكلمات؟")) return;

    setLoading(true);
    const res = await fetch(`/api/lyrics/${id}`, { method: "DELETE" });
    setLoading(false);

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      alert("حدث خطأ أثناء الحذف");
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? "جارٍ الحذف..." : "حذف"}
    </button>
  );
}
