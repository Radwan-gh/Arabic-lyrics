"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { focusRing } from "@/lib/ui";
import { PlaylistCollapsibleBody, type PlaylistBodyItem } from "@/components/PlaylistCollapsibleBody";
import { ReadingControlsBar } from "@/components/ReadingControlsBar";

interface Props {
  title: string;
  description: string | null;
  ownerName: string;
  items: PlaylistBodyItem[];
}

export function PublicPlaylistView({ title, description, ownerName, items }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <header className="border-b border-neutral-200 pb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">وصلة أناشيد مشتركة</p>
        <h1 className="mt-1 text-3xl font-extrabold">{title}</h1>
        {description && <p className="mt-1 text-neutral-600">{description}</p>}
        <p className="mt-2 text-sm text-neutral-500">
          أعدّها {ownerName} · {items.length} نشيد
        </p>
      </header>

      <ReadingControlsBar />

      <PlaylistCollapsibleBody items={items} />

      <footer className="pt-2 text-center text-sm text-neutral-500">
        <Link href="/" className={`inline-flex items-center gap-1 rounded-sm hover:text-emerald-700 ${focusRing}`}>
          تصفّح المزيد من الأناشيد <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
      </footer>
    </div>
  );
}
