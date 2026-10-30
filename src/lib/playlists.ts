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

/** Owner's playlist including each nasheed's full content, for the reading view. */
export async function getOwnedPlaylistWithContent(id: string, ownerId: string) {
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          lyrics: { select: { id: true, title: true, artist: true, album: true, content: true } },
        },
      },
    },
  });

  if (!playlist || playlist.ownerId !== ownerId) return null;
  return playlist;
}

export interface PlaylistNavContext {
  playlistId: string;
  playlistTitle: string;
  position: number;
  total: number;
  prevId: string | null;
  prevTitle: string | null;
  nextId: string | null;
  nextTitle: string | null;
}

/**
 * سياق التنقّل داخل وصلة لشاشة القراءة الغامرة (سحب للتالي/السابق): موضع النشيد
 * الحالي ضمن الوصلة والمجاورَين له. يتطلّب أن تكون الوصلة عامة أو مملوكة للمستخدم
 * الحالي، وأن يكون النشيد فعلاً أحد عناصرها — وإلا يُرجع null فيتجاهل القارئ السياق.
 */
export async function getPlaylistNavContext(
  playlistId: string,
  lyricsId: string,
  userId: string | null,
): Promise<PlaylistNavContext | null> {
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    include: {
      items: {
        orderBy: { position: "asc" },
        select: { lyricsId: true, lyrics: { select: { title: true } } },
      },
    },
  });

  if (!playlist) return null;
  if (!playlist.isPublic && playlist.ownerId !== userId) return null;

  const index = playlist.items.findIndex((item) => item.lyricsId === lyricsId);
  if (index === -1) return null;

  const prev = index > 0 ? playlist.items[index - 1] : null;
  const next = index < playlist.items.length - 1 ? playlist.items[index + 1] : null;

  return {
    playlistId: playlist.id,
    playlistTitle: playlist.title,
    position: index + 1,
    total: playlist.items.length,
    prevId: prev?.lyricsId ?? null,
    prevTitle: prev?.lyrics.title ?? null,
    nextId: next?.lyricsId ?? null,
    nextTitle: next?.lyrics.title ?? null,
  };
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

/**
 * يُلحق نشيداً بآخر الوصلة؛ عملية idempotent — النشيد الموجود مسبقاً لا يُكرَّر.
 * يُرجع true إن أُضيف فعلاً. يفترض أن المستدعي تحقّق من ملكية الوصلة ووجود النشيد.
 */
export async function appendToPlaylist(playlistId: string, lyricsId: string): Promise<boolean> {
  const last = await prisma.playlistItem.findFirst({
    where: { playlistId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const item = await prisma.playlistItem
    .create({ data: { playlistId, lyricsId, position: (last?.position ?? -1) + 1 } })
    .catch(() => null); // unique constraint → already in playlist
  return !!item;
}
