import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/session";
import { getLyricsAndIncrementViews } from "@/lib/lyrics";
import { isFavorited } from "@/lib/favorites";
import { getPlaylistNavContext } from "@/lib/playlists";
import { renderLyricsHtml } from "@/lib/render-lyrics";
import { buildWhatsAppLyrics } from "@/lib/whatsapp-lyrics";
import { isShellRequest } from "@/lib/offline";
import { LyricsDetail } from "@/components/LyricsDetail";
import { canModifyLyrics } from "@/lib/lyrics-permissions";

export default async function LyricsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ playlist?: string }>;
}) {
  const hdrs = await headers();
  const session = await getCurrentUser();
  const viewer = session ? { userId: session.userId, role: session.role } : null;

  // هيكل للقراءة دون اتصال: الواجهة نفسها بلا بيانات، تملؤها بيانات الجهاز.
  if (isShellRequest(hdrs)) {
    return <LyricsDetail data={null} loggedIn={!!session} viewer={viewer} />;
  }

  const { id } = await params;
  const { playlist: playlistId } = await searchParams;
  const lyrics = await getLyricsAndIncrementViews(id);

  if (!lyrics) notFound();

  const [favorited, playlistNav] = await Promise.all([
    session ? isFavorited(session.userId, lyrics.id) : Promise.resolve(false),
    playlistId ? getPlaylistNavContext(playlistId, lyrics.id, session?.userId ?? null) : Promise.resolve(null),
  ]);

  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const proto = hdrs.get("x-forwarded-proto") ?? "https";

  return (
    <LyricsDetail
      loggedIn={!!session}
      viewer={viewer}
      data={{
        id: lyrics.id,
        title: lyrics.title,
        artist: lyrics.artist,
        album: lyrics.album,
        viewCount: lyrics.viewCount,
        tags: lyrics.tags,
        contentHtml: renderLyricsHtml(lyrics.content),
        createdAt: lyrics.createdAt.toISOString(),
        createdByName: lyrics.createdBy?.name ?? null,
        favorited,
        canModify: canModifyLyrics(viewer, lyrics.createdById),
        shareUrl: host ? `${proto}://${host}/lyrics/${lyrics.id}` : `/lyrics/${lyrics.id}`,
        shareText: buildWhatsAppLyrics({
          title: lyrics.title,
          artist: lyrics.artist,
          content: lyrics.content,
          tags: lyrics.tags,
        }),
        siteLabel: host || undefined,
        playlist: playlistNav,
      }}
    />
  );
}
