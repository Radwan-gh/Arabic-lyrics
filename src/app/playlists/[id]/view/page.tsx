import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getOwnedPlaylistWithContent } from "@/lib/playlists";
import { renderLyricsHtml } from "@/lib/render-lyrics";
import { PlaylistReadView } from "@/components/PlaylistReadView";

export const dynamic = "force-dynamic";

export default async function PlaylistViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentUser();
  if (!session) redirect(`/login?next=/playlists/${id}/view`);

  const playlist = await getOwnedPlaylistWithContent(id, session.userId);
  if (!playlist) notFound();

  return (
    <PlaylistReadView
      id={playlist.id}
      title={playlist.title}
      description={playlist.description}
      isPublic={playlist.isPublic}
      items={playlist.items.map((item) => ({
        lyricsId: item.lyricsId,
        title: item.lyrics.title,
        artist: item.lyrics.artist,
        contentHtml: renderLyricsHtml(item.lyrics.content),
      }))}
    />
  );
}
