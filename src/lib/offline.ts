// أنواع ومعرّفات مشتركة لوضع القراءة دون اتصال (Offline PWA).
//
// الفكرة: التطبيق يجلب هذه اللقطات عبر fetch العادي، ويتولّى الـ service worker
// (public/sw.js) إرجاعها من الكاش عند انقطاع الشبكة — فلا يحتاج العميل لمعرفة
// أسماء الكاش الداخلية.

/** لقطة المجموعة العامة (كل الأناشيد) — عامة وقابلة للتخزين بأمان. */
export const OFFLINE_LYRICS_URL = "/api/public/lyrics";

/** بيانات المستخدم الخفيفة (مفضّلته وقوائمه) — خاصة، تُمسح عند تسجيل الخروج. */
export const OFFLINE_ME_URL = "/api/offline/me";

/** رسالة تُرسَل إلى الـ service worker لمسح البيانات الخاصة عند الخروج. */
export const CLEAR_PRIVATE_MESSAGE = "CLEAR_PRIVATE";

export interface OfflineLyric {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  tags: string[];
  /** ISO string — يُحوَّل إلى Date عند العرض. */
  createdAt: string;
  /** HTML مُنقّى مسبقًا عبر renderLyricsHtml. */
  contentHtml: string;
}

export interface OfflineCollection {
  updatedAt: string;
  lyrics: OfflineLyric[];
}

export interface OfflinePlaylist {
  id: string;
  title: string;
  description: string | null;
  /** معرّفات الأناشيد بالترتيب — يُحلّ محتواها من لقطة المجموعة. */
  itemIds: string[];
}

export interface OfflineMe {
  updatedAt: string;
  /** معرّفات المفضّلة بالترتيب الخاص للمستخدم. */
  favorites: string[];
  playlists: OfflinePlaylist[];
}
