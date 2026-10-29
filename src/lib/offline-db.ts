"use client";

// قاعدة بيانات الجهاز للقراءة دون اتصال (IndexedDB): الأناشيد، وبيانات المستخدم
// الخفيفة، وسجلّ المزامنة. IndexedDB لا localStorage: غير متزامنة (لا تجمّد
// الواجهة)، وسعتها أكبر بكثير، وتحفظ الكائنات كما هي.

import { hashLyricsOrder, type LyricsSyncResponse, type OfflineLyric, type OfflineMe } from "@/lib/offline";

const DB_NAME = "anaasheed-offline";
const DB_VERSION = 1;
const LYRICS_STORE = "lyrics";
const META_STORE = "meta";

/** يُطلق على window بعد كل كتابة، لتُعيد الواجهات المفتوحة قراءة البيانات. */
export const OFFLINE_DATA_EVENT = "anaasheed:offline-data";

interface LyricsSyncMeta {
  /** وقت الخادم في آخر مزامنة ناجحة — يُرسَل `since` في التالية. */
  since: string;
  /** كل المعرّفات بالترتيب الأبجدي مع مجموعات التعادل (راجع LyricsSyncResponse). */
  order: [string, number][];
}

interface MeRecord {
  session: string;
  data: OfflineMe;
}

/** آخر مزامنة اكتملت (أناشيد + بيانات المستخدم) لجلسة بعينها. */
export interface SyncedRecord {
  session: string;
  at: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openWithStores().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

// يفتح القاعدة ويضمن وجود مخازنها: إن وُجدت بنسختها لكن بلا مخازن (أنشأها طرف
// آخر قبل التطبيق، أو انقطعت ترقية سابقة) يُعاد فتحها بنسخة أعلى لتُنشأ.
function openWithStores(version?: number): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, version ?? DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LYRICS_STORE)) db.createObjectStore(LYRICS_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
    };
    request.onsuccess = () => {
      const db = request.result;
      if (db.objectStoreNames.contains(LYRICS_STORE) && db.objectStoreNames.contains(META_STORE)) {
        // ترقية مطلوبة من تبويب آخر: نُغلق الاتصال كي لا نعيقها، ويُفتح من جديد عند الحاجة.
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
        return;
      }
      const next = db.version + 1;
      db.close();
      openWithStores(next).then(resolve, reject);
    };
    request.onerror = () => reject(request.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function notifyChanged() {
  window.dispatchEvent(new Event(OFFLINE_DATA_EVENT));
}

async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return result(db.transaction(META_STORE).objectStore(META_STORE).get(key)) as Promise<T | undefined>;
}

async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(META_STORE, "readwrite");
  if (value === undefined) tx.objectStore(META_STORE).delete(key);
  else tx.objectStore(META_STORE).put(value, key);
  await done(tx);
}

/** موضع المزامنة التالية: وقت آخر مزامنة ناجحة وبصمة الترتيب المحفوظ (null: لم تُزامَن بعد). */
export async function getLyricsSyncCursor(): Promise<{ since: string; orderHash: string } | null> {
  const meta = await getMeta<LyricsSyncMeta>("lyricsSync");
  return meta ? { since: meta.since, orderHash: hashLyricsOrder(meta.order) } : null;
}

/**
 * يطبّق استجابة مزامنة في معاملة واحدة: يستبدل المتغيّر، ويحذف ما لم يعد في
 * `order` (أُزيل من الخادم)، ويحفظ الترتيب ووقت المزامنة. `order: null` يعني أن
 * الترتيب المحفوظ ما زال صحيحًا (فلا حذف). لا يُبلَّغ بتغيير إن لم يتغيّر شيء.
 */
export async function applyLyricsSync(response: LyricsSyncResponse): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([LYRICS_STORE, META_STORE], "readwrite");
  const lyrics = tx.objectStore(LYRICS_STORE);
  const meta = tx.objectStore(META_STORE);
  let order = response.order;
  if (order) {
    const current = new Set(order.map(([id]) => id));
    const keys = (await result(lyrics.getAllKeys())) as string[];
    for (const key of keys) {
      if (!current.has(key)) lyrics.delete(key);
    }
  } else {
    order = ((await result(meta.get("lyricsSync"))) as LyricsSyncMeta | undefined)?.order ?? [];
  }
  for (const lyric of response.lyrics) lyrics.put(lyric);
  meta.put({ since: response.serverTime, order } satisfies LyricsSyncMeta, "lyricsSync");
  await done(tx);
  if (response.order || response.lyrics.length) notifyChanged();
}

/** كل الأناشيد المحفوظة، مع رتبها الأبجدية من آخر مزامنة. */
export async function readAllLyrics(): Promise<OfflineLyric[]> {
  const db = await openDb();
  const tx = db.transaction([LYRICS_STORE, META_STORE]);
  const [lyrics, sync] = await Promise.all([
    result(tx.objectStore(LYRICS_STORE).getAll()) as Promise<OfflineLyric[]>,
    result(tx.objectStore(META_STORE).get("lyricsSync")) as Promise<LyricsSyncMeta | undefined>,
  ]);
  const ranks = new Map<string, [number, number]>();
  sync?.order.forEach(([id, group], index) => ranks.set(id, [index, group]));
  return lyrics.map((lyric) => {
    const rank = ranks.get(lyric.id);
    return rank ? { ...lyric, titleRank: rank[0], titleGroup: rank[1] } : lyric;
  });
}

/** بيانات المستخدم المحفوظة (null: زائر أو لم تُزامَن بعد). */
export async function readMe(): Promise<OfflineMe | null> {
  return (await getMeta<MeRecord>("me"))?.data ?? null;
}

export async function writeMe(session: string, data: OfflineMe | null): Promise<void> {
  await setMeta("me", data ? ({ session, data } satisfies MeRecord) : undefined);
  notifyChanged();
}

export async function readSynced(): Promise<SyncedRecord | null> {
  return (await getMeta<SyncedRecord>("synced")) ?? null;
}

export async function writeSynced(session: string): Promise<void> {
  await setMeta("synced", { session, at: new Date().toISOString() } satisfies SyncedRecord);
}

/** يمسح بيانات المستخدم الخاصة (عند الخروج أو تغيّر الجلسة). الأناشيد عامة فتبقى. */
export async function clearPrivateData(): Promise<void> {
  await setMeta("me", undefined);
  await setMeta("synced", undefined);
  notifyChanged();
}
