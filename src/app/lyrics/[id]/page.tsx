import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getLyricsAndIncrementViews } from "@/lib/lyrics";
import { DeleteLyricsButton } from "@/components/DeleteLyricsButton";

export default async function LyricsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lyrics, session] = await Promise.all([getLyricsAndIncrementViews(id), getCurrentUser()]);

  if (!lyrics) notFound();

  const canModify =
    !!session && (session.role === "ADMIN" || (session.role === "EDITOR" && session.userId === lyrics.createdById));

  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-col gap-1 border-b border-neutral-100 pb-4">
        <h1 className="text-2xl font-extrabold">{lyrics.title}</h1>
        {lyrics.artist && <p className="text-emerald-700">{lyrics.artist}</p>}
        {lyrics.album && <p className="text-sm text-neutral-400">{lyrics.album}</p>}
        <p className="text-xs text-neutral-400">
          أضافها {lyrics.createdBy?.name ?? "مستخدم محذوف"} · {lyrics.viewCount} مشاهدة
        </p>
      </header>

      <p className="whitespace-pre-wrap text-lg leading-loose">{lyrics.content}</p>

      {lyrics.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {lyrics.tags.map((tag) => (
            <Link
              key={tag}
              href={`/?tag=${encodeURIComponent(tag)}`}
              className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-200"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {canModify && (
        <div className="mt-6 flex gap-3 border-t border-neutral-100 pt-4">
          <Link
            href={`/lyrics/${lyrics.id}/edit`}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            تعديل
          </Link>
          <DeleteLyricsButton id={lyrics.id} />
        </div>
      )}
    </article>
  );
}
