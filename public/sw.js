// Service worker لتطبيق «أناشيد» — يدعم التثبيت (PWA) والقراءة دون اتصال.
//
// المبادئ:
// - لا يُخزَّن إطلاقًا: الطلبات غير-GET، وعبر-الأصل، ومعظم مسارات /api/*
//   (المصادقة والطفرات والقراءات الديناميكية) — حتى لا يُكسَر تسجيل الدخول ولا
//   تُعرَض بيانات قديمة.
// - يُخزَّن للقراءة دون اتصال: هيكل التطبيق وأصوله الثابتة، ولقطة المجموعة العامة
//   (/api/public/lyrics)، وبيانات المستخدم الخفيفة (/api/offline/me — تُمسح عند
//   تسجيل الخروج عبر رسالة CLEAR_PRIVATE).

const VERSION = "v2";
const STATIC_CACHE = `anaasheed-static-${VERSION}`; // أصول ثابتة + تنقّلات
const DATA_CACHE = `anaasheed-data-${VERSION}`; // لقطات JSON للقراءة دون اتصال
const KNOWN_CACHES = [STATIC_CACHE, DATA_CACHE];

const OFFLINE_URL = "/offline";
const PUBLIC_LYRICS_PATH = "/api/public/lyrics";
const OFFLINE_ME_PATH = "/api/offline/me";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // خزّن صفحة القارئ دون اتصال مسبقًا لتكون ملاذًا متاحًا دائمًا.
      try {
        const cache = await caches.open(STATIC_CACHE);
        await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      } catch {
        // لا بأس إن فشل التخزين المسبق — سيُخزَّن عند أول زيارة أونلاين.
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => !KNOWN_CACHES.includes(key)).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// السماح للعميل بمسح البيانات الخاصة (المفضّلة/القوائم) عند تسجيل الخروج،
// حتى لا تتسرّب بيانات مستخدم إلى آخر على جهاز مشترك.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (data && data.type === "CLEAR_PRIVATE") {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(DATA_CACHE);
        await cache.delete(OFFLINE_ME_PATH, { ignoreSearch: true });
      })()
    );
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // مرّر دائمًا دون تدخّل: الطلبات غير-GET أو عبر-الأصل.
  if (request.method !== "GET" || !isSameOrigin) {
    return;
  }

  // لقطة المجموعة العامة: stale-while-revalidate (تعمل دون اتصال).
  if (url.pathname === PUBLIC_LYRICS_PATH) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // بيانات المستخدم الخاصة: الشبكة أولًا، وتُخزَّن فقط عند النجاح.
  if (url.pathname === OFFLINE_ME_PATH) {
    event.respondWith(networkFirstData(request));
    return;
  }

  // بقية مسارات /api/*: تمرير دون تخزين (مصادقة/طفرات/قراءات ديناميكية).
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // التنقّلات بين الصفحات: الشبكة أولًا، ثم الكاش، ثم صفحة القارئ دون اتصال.
  if (request.mode === "navigate") {
    event.respondWith(navigationHandler(request));
    return;
  }

  // الأصول الثابتة (JS/CSS/خطوط/أيقونات): الكاش أولًا.
  event.respondWith(cacheFirst(request));
});

// يُرجِع النسخة المخزَّنة فورًا (إن وُجدت) ويحدّثها من الشبكة في الخلفية.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);
  return cached || (await network) || Response.error();
}

// الشبكة أولًا مع رجوع للكاش عند انقطاعها — للبيانات الخاصة.
async function networkFirstData(request) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw error;
  }
}

// الكاش أولًا للأصول الثابتة، مع تخزين الاستجابات الناجحة (نفس الأصل).
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === "basic") {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

// التنقّلات: جرّب الشبكة، ثم الصفحة المخزَّنة، ثم صفحة القارئ دون اتصال.
async function navigationHandler(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response(
      "لا يوجد اتصال بالإنترنت، ولم يُخزَّن هذا المحتوى بعد.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }
}
