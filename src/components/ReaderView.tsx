"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { DeleteLyricsButton } from "@/components/DeleteLyricsButton";
import { AddToPlaylist } from "@/components/AddToPlaylist";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ShareLyrics } from "@/components/ShareLyrics";
import { ExportLyricsImage } from "@/components/ExportLyricsImage";
import { LyricsFontControls } from "@/components/LyricsFontControls";
import { LyricsProse } from "@/components/LyricsProse";
import { KeepScreenAwake } from "@/components/KeepScreenAwake";
import { OfflineBanner } from "@/components/OfflineBanner";
import { OfflineEmptyState } from "@/components/OfflineEmptyState";
import { useOfflineLyricsDetail, type ReaderSsrData } from "@/hooks/use-offline-lyrics-detail";
import { formatDate } from "@/lib/format";
import { btnSecondary, focusRing } from "@/lib/ui";

/** صفحة الأنشودة على سطح المكتب. تعمل أيضًا للقراءة دون اتصال: `ssr` يُمرَّر
 * null حين لم تُصيَّر الصفحة على الخادم إطلاقًا (غلاف احتياطي)، فتُقرأ الأنشودة
 * من اللقطة المخزَّنة بمعرِّفها — نفس المكوّن، نفس المسار "/lyrics/[id]". */
export function ReaderView({ ssr, id }: { ssr: ReaderSsrData | null; id: string }) {
  const { view, online, found, sourcedFromCache } = useOfflineLyricsDetail(ssr, id);

  if (!found || !view) {
    return (
      <div className="hidden sm:block">
        <OfflineEmptyState>
          هذه الأنشودة غير محفوظة على جهازك. اتصل بالإنترنت لعرضها، أو عُد إلى المجموعة المحفوظة.
          <span className="mt-3 block">
            <Link href="/" className={`font-medium text-emerald-700 hover:underline ${focusRing}`}>
              ▸ المجموعة المحفوظة
            </Link>
          </span>
        </OfflineEmptyState>
      </div>
    );
  }

  return (
    <div className="hidden flex-col gap-4 sm:flex">
      <OfflineBanner online={online} sourcedFromCache={sourcedFromCache} />

      <article className="rounded-xl border border-neutral-200 bg-white px-3 py-5 shadow-sm sm:p-6">
        <header className="mb-4 flex flex-col gap-4 border-b border-neutral-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-extrabold font-naskh">{view.title}</h1>
            {view.artist && <p className="text-emerald-700">{view.artist}</p>}
            {view.album && <p className="text-sm text-neutral-500">{view.album}</p>}
            <p className="text-xs text-neutral-500">
              {[
                view.createdByName ? `أضافها ${view.createdByName}` : null,
                formatDate(new Date(view.createdAt)),
                `${view.viewCount} مشاهدة`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            {view.loggedIn && online && <FavoriteButton lyricsId={view.lyricsId} initialFavorited={view.favorited} />}
            <ShareLyrics shareUrl={view.shareUrl} title={view.title} shareText={view.shareText} />
            <ExportLyricsImage
              title={view.title}
              artist={view.artist}
              album={view.album}
              contentHtml={view.contentHtml}
              tags={view.tags}
              siteLabel={view.siteLabel}
            />
            {view.loggedIn && online && <AddToPlaylist lyricsId={view.lyricsId} />}
            {view.canModify && (
              <>
                <span aria-hidden="true" className="mx-1 h-6 w-px self-center bg-neutral-200" />
                <Link
                  href={`/lyrics/${view.lyricsId}/edit`}
                  className={`${btnSecondary} h-11 w-11 !p-0`}
                  aria-label="تعديل"
                  title="تعديل"
                >
                  <Pencil className="h-6 w-6" aria-hidden="true" />
                </Link>
                <DeleteLyricsButton id={view.lyricsId} />
              </>
            )}
          </div>
        </header>

        <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
          <KeepScreenAwake />
          <LyricsFontControls />
        </div>

        <LyricsProse html={view.contentHtml} />

        {view.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {view.tags.map((tag) => (
              <Link
                key={tag}
                href={`/?tags=${encodeURIComponent(tag)}`}
                className={`rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-200 ${focusRing}`}
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
