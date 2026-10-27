import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { after } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getLyrics, incrementLyricsViews } from "@/lib/lyrics";
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
  const [{ id }, { playlist: playlistId }, hdrs, session] = await Promise.all([
    params,
    searchParams,
    headers(),
    getCurrentUser(),
  ]);
  const viewer = session ? { userId: session.userId, role: session.role } : null;

  // هيكل للقراءة دون اتصال: الواجهة نفسها بلا بيانات، تملؤها بيانات الجهاز.
  if (isShellRequest(hdrs)) {
    return <LyricsDetail data={null} loggedIn={!!session} viewer={viewer} />;
  }

  // كل الاستعلامات تحتاج المعرّف فقط، فتُنفَّذ معاً في رحلة واحدة إلى قاعدة البيانات.
  const [lyrics, favorited, playlistNav] = await Promise.all([
    getLyrics(id),
    session ? isFavorited(session.userId, id) : Promise.resolve(false),
    playlistId ? getPlaylistNavContext(playlistId, id, session?.userId ?? null) : Promise.resolve(null),
  ]);

  if (!lyrics) notFound();

  // تُحتسب المشاهدة بعد إرسال الصفحة حتى لا ينتظر القارئ عملية الكتابة، ويُعرض
  // العدد شاملاً لها كما كان.
  after(() => incrementLyricsViews(lyrics.id));

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
        viewCount: lyrics.viewCount + 1,
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
