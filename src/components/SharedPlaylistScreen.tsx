"use client";

import Link from "next/link";
import { Music, Play } from "lucide-react";
import { focusRing } from "@/lib/ui";

export interface SharedPlaylistItem {
  lyricsId: string;
  title: string;
  artist: string | null;
}

interface SharedPlaylistScreenProps {
  playlistId: string;
  title: string;
  ownerName: string;
  items: SharedPlaylistItem[];
  loggedIn: boolean;
}

/** شاشة الوصلة المشتركة (زائر) الغامرة على الموبايل: ترويسة خضراء + قائمة صفوف
 * تفتح القارئ بسياق هذه الوصلة (تنقّل بالسحب من نقطة التوقّف الأولى)، ودعوة
 * لتسجيل الدخول. سطح المكتب يبقى على PublicPlaylistView الحالي (جسم قابل للطيّ). */
export function SharedPlaylistScreen({ playlistId, title, ownerName, items, loggedIn }: SharedPlaylistScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f7f4] text-[#14211c]">
      <div className="bg-emerald-700 px-5 pb-4 pt-3.5 text-white">
        <div className="flex items-center gap-2 text-xl font-extrabold">
          <Music className="h-5 w-5" aria-hidden="true" />
          أناشيد
        </div>
        <h1 className="mt-3.5 text-[26px] font-extrabold">{title}</h1>
        <div className="mt-1 text-sm opacity-85">
          شاركها {ownerName} · {items.length.toLocaleString("ar-EG")} نشيداً
        </div>
        {items.length > 0 && (
          <Link
            href={`/lyrics/${items[0].lyricsId}?playlist=${playlistId}`}
            className="mt-3.5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-base font-bold text-emerald-700"
          >
            <Play className="h-[18px] w-[18px] fill-current" aria-hidden="true" />
            ابدأ القراءة
          </Link>
        )}
      </div>

      <div className="flex-1 bg-white">
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#6b7670]">هذه الوصلة فارغة.</p>
        ) : (
          items.map((item, index) => (
            <Link
              key={item.lyricsId}
              href={`/lyrics/${item.lyricsId}?playlist=${playlistId}`}
              className={`flex min-h-16 items-center gap-3 border-b border-[#f0f0ec] px-5 py-3.5 ${focusRing}`}
            >
              <span className="w-[22px] text-sm text-[#9aa39d]">{(index + 1).toLocaleString("ar-EG")}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px] font-bold">{item.title}</div>
                {item.artist && <div className="mt-0.5 truncate text-[13px] text-[#6b7670]">{item.artist}</div>}
              </div>
            </Link>
          ))
        )}

        {!loggedIn && (
          <div className="m-5 rounded-2xl bg-[#f7f7f4] p-4 text-sm leading-[1.9] text-[#5c6660]">
            أنت تتصفح رابطاً عاماً.{" "}
            <Link href="/login" className={`font-bold text-emerald-700 ${focusRing}`}>
              سجّل الدخول
            </Link>{" "}
            لحفظ الأناشيد في مفضلتك.
          </div>
        )}
      </div>
    </div>
  );
}
