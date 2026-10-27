import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getOwnedPlaylistWithContent } from "@/lib/playlists";
import { renderLyricsHtml } from "@/lib/render-lyrics";
import { headers } from "next/headers";
import { isShellRequest } from "@/lib/offline";
import { PlaylistReadPage } from "@/components/PlaylistPages";

export const dynamic = "force-dynamic";

export default async function PlaylistViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentUser();
  if (!session) redirect(`/login?next=/playlists/${id}/view`);

  // هيكل للقراءة دون اتصال: الواجهة نفسها بلا بيانات، تملؤها بيانات الجهاز.
  if (isShellRequest(await headers())) return <PlaylistReadPage data={null} />;

  const playlist = await getOwnedPlaylistWithContent(id, session.userId);
  if (!playlist) notFound();

  return (
    <PlaylistReadPage
      data={{
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        isPublic: playlist.isPublic,
        items: playlist.items.map((item) => ({
          lyricsId: item.lyricsId,
          title: item.lyrics.title,
          artist: item.lyrics.artist,
          contentHtml: renderLyricsHtml(item.lyrics.content),
        })),
      }}
    />
  );
}
