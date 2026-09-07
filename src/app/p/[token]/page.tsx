import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicPlaylistByToken } from "@/lib/playlists";
import { renderLyricsHtml } from "@/lib/render-lyrics";
import { getCurrentUser } from "@/lib/session";
import { PublicPlaylistView } from "@/components/PublicPlaylistView";
import { SharedPlaylistScreen } from "@/components/SharedPlaylistScreen";

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
  const [playlist, session] = await Promise.all([getPublicPlaylistByToken(token), getCurrentUser()]);
  if (!playlist) notFound();

  const ownerName = playlist.owner?.name ?? "مستخدم";

  return (
    <>
      <div className="sm:hidden">
        <SharedPlaylistScreen
          playlistId={playlist.id}
          title={playlist.title}
          ownerName={ownerName}
          items={playlist.items.map((item) => ({
            lyricsId: item.lyricsId,
            title: item.lyrics.title,
            artist: item.lyrics.artist,
          }))}
          loggedIn={!!session}
        />
      </div>
      <div className="hidden sm:block">
        <PublicPlaylistView
          title={playlist.title}
          description={playlist.description}
          ownerName={ownerName}
          items={playlist.items.map((item) => ({
            lyricsId: item.lyricsId,
            title: item.lyrics.title,
            artist: item.lyrics.artist,
            contentHtml: renderLyricsHtml(item.lyrics.content),
          }))}
        />
      </div>
    </>
  );
}
