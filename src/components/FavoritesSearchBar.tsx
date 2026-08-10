"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { inputCls, btnPrimary } from "@/lib/ui";

export function FavoritesSearchBar({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    const qs = params.toString();
    router.push(qs ? `/favorites?${qs}` : "/favorites");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="ابحث في مفضّلتك بالعنوان أو الفنان أو الأنشودة..."
        aria-label="ابحث في مفضّلتك"
        className={inputCls}
      />
      <button type="submit" className={`${btnPrimary} shrink-0`}>
        بحث
      </button>
    </form>
  );
}
