import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/session";
import { getOwnedPlaylist } from "@/lib/playlists";
import { PlaylistDetailView } from "@/components/PlaylistDetailView";

export const dynamic = "force-dynamic";

export default async function PlaylistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentUser();
  if (!session) redirect(`/login?next=/playlists/${id}`);

  const playlist = await getOwnedPlaylist(id, session.userId);
  if (!playlist) notFound();

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const shareUrl = host ? `${proto}://${host}/p/${playlist.shareToken}` : `/p/${playlist.shareToken}`;

  return (
    <PlaylistDetailView
      playlist={{
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        isPublic: playlist.isPublic,
        items: playlist.items.map((item) => ({
          lyricsId: item.lyricsId,
          title: item.lyrics.title,
          artist: item.lyrics.artist,
          album: item.lyrics.album,
        })),
      }}
      shareUrl={shareUrl}
    />
  );
}
