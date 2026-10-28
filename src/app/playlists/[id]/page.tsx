import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/session";
import { getOwnedPlaylist } from "@/lib/playlists";
import { isShellRequest } from "@/lib/offline";
import { PlaylistDetailPage as PlaylistDetailPageView } from "@/components/PlaylistPages";

export const dynamic = "force-dynamic";

export default async function PlaylistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentUser();
  if (!session) redirect(`/login?next=/playlists/${id}`);

  const hdrs = await headers();
  // هيكل للقراءة دون اتصال: الواجهة نفسها بلا بيانات، تملؤها بيانات الجهاز.
  if (isShellRequest(hdrs)) return <PlaylistDetailPageView data={null} />;

  const playlist = await getOwnedPlaylist(id, session.userId);
  if (!playlist) notFound();

  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const shareUrl = host ? `${proto}://${host}/p/${playlist.shareToken}` : `/p/${playlist.shareToken}`;

  const items = playlist.items.map((item) => ({
    lyricsId: item.lyricsId,
    title: item.lyrics.title,
    artist: item.lyrics.artist,
    album: item.lyrics.album,
  }));

  return (
    <PlaylistDetailPageView
      data={{
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        isPublic: playlist.isPublic,
        items,
        shareUrl,
      }}
    />
  );
}
