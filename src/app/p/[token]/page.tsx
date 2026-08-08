import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicPlaylistByToken } from "@/lib/playlists";
import { renderLyricsHtml } from "@/lib/render-lyrics";
import { PublicPlaylistView } from "@/components/PublicPlaylistView";

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
    <PublicPlaylistView
      title={playlist.title}
      description={playlist.description}
      ownerName={playlist.owner?.name ?? "مستخدم"}
      items={playlist.items.map((item) => ({
        lyricsId: item.lyricsId,
        title: item.lyrics.title,
        artist: item.lyrics.artist,
        contentHtml: renderLyricsHtml(item.lyrics.content),
      }))}
    />
  );
}
