import { prisma } from "./prisma";

/** Playlist with its ordered items and their lyrics, for owner management views. */
export async function getOwnedPlaylist(id: string, ownerId: string) {
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          lyrics: { select: { id: true, title: true, artist: true, album: true } },
        },
      },
    },
  });

  if (!playlist || playlist.ownerId !== ownerId) return null;
  return playlist;
}

/** Public playlist looked up by its share token; only returned when marked public. */
export async function getPublicPlaylistByToken(token: string) {
  const playlist = await prisma.playlist.findUnique({
    where: { shareToken: token },
    include: {
      owner: { select: { name: true } },
      items: {
        orderBy: { position: "asc" },
        include: {
          lyrics: { select: { id: true, title: true, artist: true, album: true, content: true } },
        },
      },
    },
  });

  if (!playlist || !playlist.isPublic) return null;
  return playlist;
}
