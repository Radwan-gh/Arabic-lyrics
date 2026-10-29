"use client";

// مزامنة بيانات الجهاز وتهيئة هياكل الصفحات، وحالة الحفظ المجمَّعة للواجهة.
//
// الخطوات (متصلًا): الأناشيد (بالتغييرات فقط منذ آخر مزامنة) → بيانات المستخدم
// (إن كان مسجّلًا) → يطلب من الـ SW تخزين هياكل الصفحات. دون اتصال تُحسب الحالة
// مما حُفظ سابقًا لهذه الجلسة.

import {
  OFFLINE_LYRICS_URL,
  OFFLINE_ME_URL,
  WARM_SHELLS_MESSAGE,
  WARM_STATUS_MESSAGE,
  hashString,
  type LyricsSyncResponse,
  type OfflineMe,
  type OfflineStatus,
} from "@/lib/offline";
import {
  applyLyricsSync,
  clearPrivateData,
  getLyricsSyncCursor,
  readAllLyrics,
  readSynced,
  writeMe,
  writeSynced,
} from "@/lib/offline-db";

/** هياكل الصفحات: تُجلب بترويسة SHELL_HEADER وتُخدَم لكل مسار من نوعها دون اتصال. */
const PUBLIC_SHELLS = ["/", "/lyrics/_"];
const USER_SHELLS = ["/favorites", "/playlists", "/playlists/_", "/playlists/_/view"];
/** صفحة «الوصلات العامة» لا بيانات لها على الجهاز، فتُخزَّن كما هي وتُحدَّث كل ساعة. */
const DISCOVER_URL = "/discover";
const DISCOVER_REFRESH_MS = 60 * 60 * 1000;

interface ShellRequest {
  url: string;
  version: string;
  shell: boolean;
}

interface DataState {
  session: string;
  running: boolean;
  done: number;
  total: number;
  complete: boolean;
  /** عدد ما يلزم الـ SW تخزينه لهذه الجلسة. */
  shells: number;
}

type ShellState = OfflineStatus & { session?: string };

let dataState: DataState | null = null;
let shellState: ShellState | null = null;
const listeners = new Set<() => void>();
let combined: OfflineStatus | null = null;

function recompute() {
  if (!dataState) {
    combined = null;
  } else {
    const shells = shellState && shellState.session === dataState.session ? shellState : null;
    const shellsDone = shells ? Math.min(shells.done, dataState.shells) : 0;
    combined = {
      total: dataState.total + dataState.shells,
      done: dataState.done + shellsDone,
      running: dataState.running || !!shells?.running,
      complete: dataState.complete && !!shells?.complete,
    };
  }
  listeners.forEach((listener) => listener());
}

export function subscribeOfflineStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOfflineStatus(): OfflineStatus | null {
  return combined;
}

function setData(patch: Partial<DataState>) {
  if (dataState) dataState = { ...dataState, ...patch };
  recompute();
}

let swListening = false;

function listenToServiceWorker() {
  if (swListening) return;
  swListening = true;
  navigator.serviceWorker.addEventListener("message", (event: MessageEvent) => {
    if (event.data?.type === WARM_STATUS_MESSAGE) {
      shellState = event.data.status ?? null;
      recompute();
    }
  });
  navigator.serviceWorker.ready
    .then((registration) => registration.active?.postMessage({ type: WARM_STATUS_MESSAGE }))
    .catch(() => {});
}

/** بصمة نسخة التطبيق: ملف تشغيل webpack يتغيّر اسمه مع كل نشر، فتُحدَّث الهياكل. */
function buildVersion(): string {
  const runtime = document.querySelector<HTMLScriptElement>('script[src*="/_next/static/chunks/webpack-"]');
  const source = runtime?.src ?? [...document.scripts].map((s) => s.src).join("|");
  return hashString(source);
}

function shellRequests(authenticated: boolean): ShellRequest[] {
  const version = buildVersion();
  const shells = [...PUBLIC_SHELLS, ...(authenticated ? USER_SHELLS : [])];
  return [
    ...shells.map((url) => ({ url, version, shell: true })),
    { url: DISCOVER_URL, version: String(Math.floor(Date.now() / DISCOVER_REFRESH_MS)), shell: false },
  ];
}

function waitForController(timeoutMs = 10_000): Promise<boolean> {
  if (navigator.serviceWorker.controller) return Promise.resolve(true);
  return new Promise((resolve) => {
    const finish = (ok: boolean) => {
      clearTimeout(timer);
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
      resolve(ok);
    };
    const onChange = () => finish(true);
    const timer = setTimeout(() => finish(!!navigator.serviceWorker.controller), timeoutMs);
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
  });
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return (await res.json()) as T;
}

let running: Promise<void> | null = null;
let rerun = false;

/**
 * يزامن بيانات الجهاز ويطلب تخزين الهياكل. `sessionKey` يعرّف الجلسة (null للزائر):
 * إن تغيّرت عن آخر مزامنة تُمسح بيانات المستخدم السابق أولًا. يعمل بصمت؛ الفشل
 * يترك الحالة «غير مكتملة» ويُستكمل في المرة التالية.
 */
export function syncOfflineData(sessionKey: string | null): Promise<void> {
  if (running) {
    rerun = true;
    return running;
  }
  running = runSync(sessionKey).finally(() => {
    running = null;
    if (rerun) {
      rerun = false;
      void syncOfflineData(sessionKey);
    }
  });
  return running;
}

async function runSync(sessionKey: string | null): Promise<void> {
  if (!("serviceWorker" in navigator) || typeof indexedDB === "undefined") return;
  listenToServiceWorker();
  const session = hashString(sessionKey ?? "");
  const authenticated = !!sessionKey;
  const total = authenticated ? 2 : 1;
  const shells = shellRequests(authenticated);

  const synced = await readSynced().catch(() => null);
  if (synced && synced.session !== session) await clearPrivateData().catch(() => {});
  const previouslyComplete = synced?.session === session && (await readAllLyrics().catch(() => [])).length > 0;

  dataState = {
    session,
    running: false,
    done: previouslyComplete ? total : 0,
    total,
    complete: previouslyComplete,
    shells: shells.length,
  };
  recompute();
  if (!navigator.onLine) return;

  // ما دام كل شيء محفوظًا فالمزامنة تحديث صامت في الخلفية: تبقى الحالة «متاح دون
  // إنترنت» (البيانات الحالية صالحة للقراءة)، ولا يظهر تقدّم إلا للحفظ الأول أو
  // بعد تغيّر الجلسة.
  const showProgress = !previouslyComplete;
  if (showProgress) setData({ running: true, done: 0, complete: false });
  try {
    const cursor = await getLyricsSyncCursor();
    const query = cursor
      ? `?since=${encodeURIComponent(cursor.since)}&orderHash=${encodeURIComponent(cursor.orderHash)}`
      : "";
    await applyLyricsSync(await fetchJson<LyricsSyncResponse>(`${OFFLINE_LYRICS_URL}${query}`));
    if (showProgress) setData({ done: 1 });
    if (authenticated) {
      await writeMe(session, await fetchJson<OfflineMe>(OFFLINE_ME_URL));
      if (showProgress) setData({ done: 2 });
    } else {
      await writeMe(session, null);
    }
    await writeSynced(session);
    setData({ running: false, done: total, complete: true });
  } catch {
    // فشل التحديث لا يُلغي ما حُفظ سابقًا: تبقى الحالة كما كانت.
    setData({ running: false });
    return;
  }

  // في الزيارة الأولى لا يتحكّم الـ SW بالصفحة فور تفعيله؛ ننتظره ليستقبل الطلب.
  if (!(await waitForController())) return;
  const worker = (await navigator.serviceWorker.ready).active;
  worker?.postMessage({ type: WARM_SHELLS_MESSAGE, session, authenticated, pages: shells });
}

/** عند تسجيل الخروج: بيانات المستخدم لا تبقى على الجهاز. */
export function clearOfflineSession(): Promise<void> {
  return clearPrivateData().catch(() => {});
}
