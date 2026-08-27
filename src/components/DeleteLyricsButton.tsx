"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { btnDanger } from "@/lib/ui";

export function DeleteLyricsButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("هل أنت متأكد من حذف هذه الأنشودة؟")) return;

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
      aria-label="حذف"
      title="حذف"
      className={`${btnDanger} h-11 w-11 !p-0`}
    >
      <Trash2 className="h-6 w-6" aria-hidden="true" />
    </button>
  );
}
