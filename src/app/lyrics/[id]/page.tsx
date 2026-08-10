import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getLyricsAndIncrementViews } from "@/lib/lyrics";
import { renderLyricsHtml } from "@/lib/render-lyrics";
import { lyricsProseCls } from "@/lib/lyrics-prose";
import { formatDate } from "@/lib/format";
import { DeleteLyricsButton } from "@/components/DeleteLyricsButton";
import { AddToPlaylist } from "@/components/AddToPlaylist";
import { btnSecondary, focusRing } from "@/lib/ui";

export default async function LyricsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lyrics, session] = await Promise.all([getLyricsAndIncrementViews(id), getCurrentUser()]);

  if (!lyrics) notFound();

  const canModify =
    !!session && (session.role === "ADMIN" || (session.role === "EDITOR" && session.userId === lyrics.createdById));

  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-col gap-4 border-b border-neutral-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold">{lyrics.title}</h1>
          {lyrics.artist && <p className="text-emerald-700">{lyrics.artist}</p>}
          {lyrics.album && <p className="text-sm text-neutral-500">{lyrics.album}</p>}
          <p className="text-xs text-neutral-500">
            أضافها {lyrics.createdBy?.name ?? "مستخدم محذوف"} · {formatDate(lyrics.createdAt)} · {lyrics.viewCount} مشاهدة
          </p>
        </div>
        {(session || canModify) && (
          <div className="flex flex-shrink-0 flex-wrap gap-3">
            {session && <AddToPlaylist lyricsId={lyrics.id} />}
            {canModify && (
              <>
                <Link href={`/lyrics/${lyrics.id}/edit`} className={`${btnSecondary} px-4 py-2`}>
                  تعديل
                </Link>
                <DeleteLyricsButton id={lyrics.id} />
              </>
            )}
          </div>
        )}
      </header>

      <div dir="rtl" className={lyricsProseCls} dangerouslySetInnerHTML={{ __html: renderLyricsHtml(lyrics.content) }} />

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
