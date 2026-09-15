import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/session";
import { getLyricsAndIncrementViews } from "@/lib/lyrics";
import { isFavorited } from "@/lib/favorites";
import { getPlaylistNavContext } from "@/lib/playlists";
import { renderLyricsHtml } from "@/lib/render-lyrics";
import { buildWhatsAppLyrics } from "@/lib/whatsapp-lyrics";
import { ReaderScreen } from "@/components/ReaderScreen";
import { ReaderView } from "@/components/ReaderView";
import type { ReaderSsrData } from "@/hooks/use-offline-lyrics-detail";

export default async function LyricsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ playlist?: string }>;
}) {
  const { id } = await params;
  const { playlist: playlistId } = await searchParams;
  const [lyrics, session] = await Promise.all([getLyricsAndIncrementViews(id), getCurrentUser()]);

  if (!lyrics) notFound();

  const [favorited, playlistNav] = await Promise.all([
    session ? isFavorited(session.userId, lyrics.id) : Promise.resolve(false),
    playlistId ? getPlaylistNavContext(playlistId, lyrics.id, session?.userId ?? null) : Promise.resolve(null),
  ]);

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

  const ssr: ReaderSsrData = {
    lyricsId: lyrics.id,
    title: lyrics.title,
    artist: lyrics.artist,
    album: lyrics.album,
    createdAt: lyrics.createdAt.toISOString(),
    createdByName: lyrics.createdBy?.name ?? "مستخدم محذوف",
    viewCount: lyrics.viewCount,
    tags: lyrics.tags,
    contentHtml,
    favorited,
    loggedIn: !!session,
    canModify,
    shareUrl,
    shareText,
    siteLabel: host || undefined,
    playlist: playlistNav,
  };

  return (
    <>
      {/* الموبايل: شاشة قراءة غامرة (كروم أدنى، تنقّل بالسحب). سطح المكتب يبقى كما هو أدناه. */}
      <div className="sm:hidden">
        <ReaderScreen ssr={ssr} id={lyrics.id} />
      </div>

      <ReaderView ssr={ssr} id={lyrics.id} />
    </>
  );
}
