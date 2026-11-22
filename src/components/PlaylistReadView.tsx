"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { focusRing } from "@/lib/ui";
import { MenuButton } from "@/components/MenuButton";
import { PlaylistStackedBody, type PlaylistBodyItem } from "@/components/PlaylistStackedBody";
import { ReadingSettingsButton, readingSettingsIconBtn, useReadingPrefs } from "@/components/ReadingSettingsButton";

interface Props {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  items: PlaylistBodyItem[];
}

/** قراءة الوصلة كاملةً: الأناشيد تحت بعضها + فهرس عائم للعناوين. على الموبايل شاشة
 * غامرة بشريط علوي ثابت يحمل اسم الوصلة وزر ضبط القراءة؛ على سطح المكتب داخل التخطيط المعتاد. */
export function PlaylistReadView({ id, title, description, isPublic, items }: Props) {
  const prefs = useReadingPrefs();

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink sm:min-h-0 sm:gap-6 sm:bg-transparent">
      <header className="sticky top-0 z-20 flex items-center gap-0.5 border-b border-line bg-canvas/95 px-3 py-1 backdrop-blur sm:hidden">
        <Link
          href={`/playlists/${id}`}
          aria-label="رجوع إلى الوصلة"
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-2 ${focusRing}`}
        >
          <ChevronRight className="h-[22px] w-[22px]" aria-hidden="true" />
        </Link>
        <MenuButton />
        <span className="min-w-0 flex-1 truncate px-1 text-base font-bold">{title}</span>
        <ReadingSettingsButton prefs={prefs} />
      </header>

      <div className="px-5 pb-4 pt-4 sm:border-b sm:border-neutral-200 sm:px-0 sm:pt-0">
        <Link
          href={`/playlists/${id}`}
          className={`hidden items-center gap-1 rounded-sm text-sm text-neutral-600 hover:text-accent sm:inline-flex ${focusRing}`}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" /> العودة إلى الوصلة
        </Link>
        <div className="flex items-start justify-between gap-3 sm:mt-2">
          <h1 className="text-[26px] font-extrabold sm:text-3xl">{title}</h1>
          <div className="hidden sm:block">
            <ReadingSettingsButton
              prefs={prefs}
              className={`${readingSettingsIconBtn} border border-neutral-200 bg-surface`}
            />
          </div>
        </div>
        {description && <p className="mt-1 text-neutral-600">{description}</p>}
        <p className="mt-1 text-sm text-neutral-500">
          {items.length.toLocaleString("ar-EG")} نشيداً · {isPublic ? "عامة" : "خاصة"}
        </p>
      </div>

      <PlaylistStackedBody items={items} lineSpacing={prefs.lineSpacing} />
    </div>
  );
}
