import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicPlaylistByToken } from "@/lib/playlists";
import { renderLyricsHtml } from "@/lib/render-lyrics";
import { lyricsProseCls } from "@/lib/lyrics-prose";
import { focusRing } from "@/lib/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const playlist = await getPublicPlaylistByToken(token);
  if (!playlist) return { title: "وصلة غير متاحة" };
  return {
    title: `${playlist.title} · وصلة أناشيد`,
    description: playlist.description ?? undefined,
  };
}

export default async function SharedPlaylistPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const playlist = await getPublicPlaylistByToken(token);
  if (!playlist) notFound();

  return (
    <div className="flex flex-col gap-6">
      <header className="border-b border-neutral-200 pb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">وصلة أناشيد مشتركة</p>
        <h1 className="mt-1 text-3xl font-extrabold">{playlist.title}</h1>
        {playlist.description && <p className="mt-1 text-neutral-600">{playlist.description}</p>}
        <p className="mt-2 text-sm text-neutral-500">
          أعدّها {playlist.owner?.name ?? "مستخدم"} · {playlist.items.length} نشيد
        </p>
      </header>

      {playlist.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
          هذه الوصلة فارغة.
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {playlist.items.map((item, index) => (
            <li key={item.lyricsId} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-baseline gap-2 border-b border-neutral-100 pb-3">
                <span className="text-sm text-neutral-500">{index + 1}</span>
                <div>
                  <Link href={`/lyrics/${item.lyricsId}`} className={`rounded-sm text-xl font-bold hover:text-emerald-700 ${focusRing}`}>
                    {item.lyrics.title}
                  </Link>
                  {item.lyrics.artist && <p className="text-sm text-emerald-700">{item.lyrics.artist}</p>}
                </div>
              </div>
              <div
                dir="rtl"
                className={lyricsProseCls}
                dangerouslySetInnerHTML={{ __html: renderLyricsHtml(item.lyrics.content) }}
              />
            </li>
          ))}
        </ol>
      )}

      <footer className="pt-2 text-center text-sm text-neutral-500">
        <Link href="/" className={`inline-flex items-center gap-1 rounded-sm hover:text-emerald-700 ${focusRing}`}>
          تصفّح المزيد من الأناشيد <span aria-hidden>←</span>
        </Link>
      </footer>
    </div>
  );
}
