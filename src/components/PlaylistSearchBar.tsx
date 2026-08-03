"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PlaylistSearchBar({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    const qs = params.toString();
    router.push(qs ? `/discover?${qs}` : "/discover");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="ابحث في القوائم العامة بالاسم أو الوصف..."
        className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-base focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
      />
      <button
        type="submit"
        className="shrink-0 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
      >
        بحث
      </button>
    </form>
  );
}
