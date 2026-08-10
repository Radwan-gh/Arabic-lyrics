import { prisma } from "./prisma";

/** Whether the given user has favorited a specific nasheed. */
export async function isFavorited(userId: string, lyricsId: string): Promise<boolean> {
  const fav = await prisma.favorite.findUnique({
    where: { userId_lyricsId: { userId, lyricsId } },
    select: { id: true },
  });
  return !!fav;
}

/**
 * Of the supplied lyrics ids, the subset the user has favorited — returned as a
 * Set for O(1) lookups when rendering a list of cards.
 */
export async function getFavoritedLyricsIds(userId: string, lyricsIds: string[]): Promise<Set<string>> {
  if (lyricsIds.length === 0) return new Set();
  const favs = await prisma.favorite.findMany({
    where: { userId, lyricsId: { in: lyricsIds } },
    select: { lyricsId: true },
  });
  return new Set(favs.map((f) => f.lyricsId));
}
