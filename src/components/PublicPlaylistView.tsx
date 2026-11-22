"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { focusRing } from "@/lib/ui";
import { PlaylistStackedBody, type PlaylistBodyItem } from "@/components/PlaylistStackedBody";
import { ReadingSettingsButton, readingSettingsIconBtn, useReadingPrefs } from "@/components/ReadingSettingsButton";

interface Props {
  title: string;
  description: string | null;
  ownerName: string;
  items: PlaylistBodyItem[];
}

export function PublicPlaylistView({ title, description, ownerName, items }: Props) {
  const prefs = useReadingPrefs();
  return (
    <div className="flex flex-col gap-6">
      <header className="border-b border-neutral-200 pb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">وصلة أناشيد مشتركة</p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h1 className="text-3xl font-extrabold">{title}</h1>
          <ReadingSettingsButton
            prefs={prefs}
            className={`${readingSettingsIconBtn} border border-neutral-200 bg-surface`}
          />
        </div>
        {description && <p className="mt-1 text-neutral-600">{description}</p>}
        <p className="mt-2 text-sm text-neutral-500">
          أعدّها {ownerName} · {items.length} نشيد
        </p>
      </header>

      <PlaylistStackedBody items={items} lineSpacing={prefs.lineSpacing} />

      <footer className="pt-2 text-center text-sm text-neutral-500">
        <Link href="/" className={`inline-flex items-center gap-1 rounded-sm hover:text-accent ${focusRing}`}>
          تصفّح المزيد من الأناشيد <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
      </footer>
    </div>
  );
}
