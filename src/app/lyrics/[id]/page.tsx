import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getLyricsAndIncrementViews } from "@/lib/lyrics";
import { isFavorited } from "@/lib/favorites";
import { renderLyricsHtml } from "@/lib/render-lyrics";
import { buildWhatsAppLyrics } from "@/lib/whatsapp-lyrics";
import { formatDate } from "@/lib/format";
import { DeleteLyricsButton } from "@/components/DeleteLyricsButton";
import { AddToPlaylist } from "@/components/AddToPlaylist";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ShareLyrics } from "@/components/ShareLyrics";
import { ExportLyricsImage } from "@/components/ExportLyricsImage";
import { LyricsFontControls } from "@/components/LyricsFontControls";
import { LyricsProse } from "@/components/LyricsProse";
import { KeepScreenAwake } from "@/components/KeepScreenAwake";
import { btnSecondary, focusRing } from "@/lib/ui";

export default async function LyricsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lyrics, session] = await Promise.all([getLyricsAndIncrementViews(id), getCurrentUser()]);

  if (!lyrics) notFound();

  const favorited = session ? await isFavorited(session.userId, lyrics.id) : false;

  const canModify =
    !!session && (session.role === "ADMIN" || (session.role === "EDITOR" && session.userId === lyrics.createdById));

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const shareUrl = host ? `${proto}://${host}/lyrics/${lyrics.id}` : `/lyrics/${lyrics.id}`;
  const shareText = buildWhatsAppLyrics({
    title: lyrics.title,
    artist: lyrics.artist,
    content: lyrics.content,
    tags: lyrics.tags,
  });
  const contentHtml = renderLyricsHtml(lyrics.content);

  return (
    <article className="rounded-xl border border-neutral-200 bg-white px-3 py-5 shadow-sm sm:p-6">
      <header className="mb-4 flex flex-col gap-4 border-b border-neutral-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold font-naskh">{lyrics.title}</h1>
          {lyrics.artist && <p className="text-emerald-700">{lyrics.artist}</p>}
          {lyrics.album && <p className="text-sm text-neutral-500">{lyrics.album}</p>}
          <p className="text-xs text-neutral-500">
            أضافها {lyrics.createdBy?.name ?? "مستخدم محذوف"} · {formatDate(lyrics.createdAt)} · {lyrics.viewCount} مشاهدة
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          {session && <FavoriteButton lyricsId={lyrics.id} initialFavorited={favorited} />}
          <ShareLyrics shareUrl={shareUrl} title={lyrics.title} shareText={shareText} />
          <ExportLyricsImage
            title={lyrics.title}
            artist={lyrics.artist}
            album={lyrics.album}
            contentHtml={contentHtml}
            tags={lyrics.tags}
            siteLabel={host || undefined}
          />
          {session && <AddToPlaylist lyricsId={lyrics.id} />}
          {canModify && (
            <>
              <span aria-hidden="true" className="mx-1 h-6 w-px self-center bg-neutral-200" />
              <Link
                href={`/lyrics/${lyrics.id}/edit`}
                className={`${btnSecondary} h-11 w-11 !p-0`}
                aria-label="تعديل"
                title="تعديل"
              >
                <Pencil className="h-6 w-6" aria-hidden="true" />
              </Link>
              <DeleteLyricsButton id={lyrics.id} />
            </>
          )}
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        <KeepScreenAwake />
        <LyricsFontControls />
      </div>

      <LyricsProse html={contentHtml} />

      {lyrics.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {lyrics.tags.map((tag) => (
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
  );
}
