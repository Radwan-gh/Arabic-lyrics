"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { focusRing } from "@/lib/ui";
import { PlaylistReadShell } from "@/components/PlaylistReadShell";
import type { PlaylistBodyItem } from "@/components/PlaylistStackedBody";

interface Props {
  title: string;
  description: string | null;
  ownerName: string;
  items: PlaylistBodyItem[];
  loggedIn: boolean;
}

/** الوصلة المشتركة برابط عام (‎/p/[token]‎) — قراءة متتالية على الموبايل وسطح المكتب،
 * بالتخطيط نفسه لعرض المالك، مع دعوة الزائر لتسجيل الدخول. */
export function PublicPlaylistView({ title, description, ownerName, items, loggedIn }: Props) {
  return (
    <PlaylistReadShell
      title={title}
      description={description}
      eyebrow="وصلة أناشيد مشتركة"
      meta={`أعدّها ${ownerName} · ${items.length.toLocaleString("ar-EG")} نشيداً`}
      items={items}
      footer={
        <div className="mx-4 flex flex-col items-center gap-3 text-center text-sm text-neutral-500 sm:mx-0">
          {!loggedIn && (
            <p className="w-full rounded-2xl border border-line bg-surface p-4 leading-[1.9] text-ink-3">
              أنت تتصفح رابطاً عاماً.{" "}
              <Link href="/login" className={`rounded-sm font-bold text-accent ${focusRing}`}>
                سجّل الدخول
              </Link>{" "}
              لحفظ الأناشيد في مفضلتك.
            </p>
          )}
          <Link href="/" className={`inline-flex min-h-11 items-center gap-1 rounded-sm hover:text-accent ${focusRing}`}>
            تصفّح المزيد من الأناشيد <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      }
    />
  );
}
