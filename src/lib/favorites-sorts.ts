// خيارات ترتيب المفضّلة ومعاملات رابطها — مشتركة بين الخادم والجهاز (دون اتصال).

export const FAVORITES_PAGE_SIZE = 50;

export const FAVORITES_SORT_LABELS = {
  recent: "الأحدث",
  oldest: "الأقدم",
  title: "العنوان",
  artist: "المنشد",
  custom: "ترتيبي الخاص",
} as const;

export type FavoritesSortKey = keyof typeof FAVORITES_SORT_LABELS;

export const FAVORITES_SORT_OPTIONS = (Object.keys(FAVORITES_SORT_LABELS) as FavoritesSortKey[]).map((value) => ({
  value,
  label: FAVORITES_SORT_LABELS[value],
}));

export interface FavoritesParams {
  query: string;
  sort: FavoritesSortKey;
  page: number;
}

export function parseFavoritesParams(params: { q?: string | null; sort?: string | null; page?: string | null }): FavoritesParams {
  const sort = params.sort && params.sort in FAVORITES_SORT_LABELS ? (params.sort as FavoritesSortKey) : "recent";
  return {
    query: (params.q ?? "").trim(),
    sort,
    // الترتيب المخصّص قائمة واحدة بلا صفحات.
    page: sort === "custom" ? 1 : Math.max(1, Number(params.page) || 1),
  };
}

export function favoritesParamsKey(p: FavoritesParams): string {
  return JSON.stringify([p.query, p.sort, p.page]);
}
