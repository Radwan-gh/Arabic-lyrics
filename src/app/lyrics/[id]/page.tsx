import type { Metadata } from "next";
import { cache } from "react";
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

// يُستعمل النشيد في العنوان وفي الصفحة معاً، فيُجلب مرة واحدة لكل طلب.
const loadLyrics = cache(getLyrics);

/** أصل الموقع المطلق — روابط المعاينة (واتساب وغيره) لا تقبل مساراً نسبياً للصورة. */
function requestOrigin(hdrs: { get(name: string): string | null }): string | null {
  const configured = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  if (!host) return null;
  return `${hdrs.get("x-forwarded-proto") ?? "https"}://${host}`;
}

/** عنوان الصفحة = عنوان النشيد، مع بطاقة معاينة عند المشاركة تحمل العنوان وشعار «نفحات». */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const [{ id }, hdrs] = await Promise.all([params, headers()]);
  // هيكل القراءة دون اتصال بلا بيانات: يضبط المتصفح العنوان بعد تحميلها من الجهاز.
  if (isShellRequest(hdrs)) return {};

  const lyrics = await loadLyrics(id);
  if (!lyrics) return { title: "نشيد غير موجود" };

  const origin = requestOrigin(hdrs);
  const description = lyrics.artist ? `${lyrics.artist} · نفحات - ديوان الإنشاد` : "نفحات - ديوان الإنشاد";
  const image = { url: "/icons/icon-maskable-512.png", width: 512, height: 512, alt: "نفحات", type: "image/png" };

  return {
    title: lyrics.title,
    description,
    metadataBase: origin ? new URL(origin) : undefined,
    openGraph: {
      type: "article",
      title: lyrics.title,
      description,
      url: `/lyrics/${lyrics.id}`,
      siteName: "نفحات",
      locale: "ar",
      images: [image],
    },
    twitter: { card: "summary", title: lyrics.title, description, images: [image.url] },
  };
}

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
    loadLyrics(id),
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
