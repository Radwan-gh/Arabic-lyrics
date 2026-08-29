// Service worker لتطبيق «أناشيد» — يدعم التثبيت (PWA) والقراءة دون اتصال.
//
// المبادئ:
// - لا يُخزَّن إطلاقًا: الطلبات غير-GET، وعبر-الأصل، ومعظم مسارات /api/*
//   (المصادقة والطفرات والقراءات الديناميكية) — حتى لا يُكسَر تسجيل الدخول ولا
//   تُعرَض بيانات قديمة.
// - يُخزَّن للقراءة دون اتصال: هيكل التطبيق وأصوله الثابتة، ولقطة المجموعة العامة
//   (/api/public/lyrics)، وبيانات المستخدم الخفيفة (/api/offline/me — تُمسح عند
//   تسجيل الخروج عبر رسالة CLEAR_PRIVATE).
//
// آلية «المرآة»: عند انقطاع الشبكة يخدم الـ SW غلاف /offline لأي تنقّل غير مخزَّن،
// فيقرأ OfflineReader المسار (‎/lyrics/<id>‎، /favorites …) ويعرض نفس الواجهة من
// اللقطة. لكي تعمل هذه المرآة يجب أن تكون أصول صفحة /offline (JS/CSS/الخط)
// مخزَّنة مسبقًا — وإلا فشل تحميلها دون اتصال. لذا نخزّنها مسبقًا عند التثبيت
// باستخراج روابط /_next/static من صفحة /offline نفسها (لا نعتمد على زيارة
// المستخدم لصفحة /offline وهو متصل).

const VERSION = "v4";
const STATIC_CACHE = `anaasheed-static-${VERSION}`; // أصول ثابتة + تنقّلات
const DATA_CACHE = `anaasheed-data-${VERSION}`; // لقطات JSON للقراءة دون اتصال
const KNOWN_CACHES = [STATIC_CACHE, DATA_CACHE];

const OFFLINE_URL = "/offline";
const PUBLIC_LYRICS_PATH = "/api/public/lyrics";
const OFFLINE_ME_PATH = "/api/offline/me";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // خزّن صفحة القارئ دون اتصال وأصولها مسبقًا لتكون ملاذًا عاملًا دائمًا
      // (حتى لو لم يزُر المستخدم /offline وهو متصل من قبل).
      await precacheOfflineShell();
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

  // طلبات React Server Components (تنقّل داخل التطبيق دون إعادة تحميل الصفحة):
  // جرّب الشبكة، وعند فشلها أعِد خطأ شبكة نظيفًا ليتراجع Next.js إلى تنقّل كامل
  // (الذي يُلتقط أدناه كـ navigate فيُخدَم غلاف /offline). لا نُخزّن حمولات RSC.
  if (isRscRequest(request, url)) {
    event.respondWith(networkOrError(request));
    return;
  }

  // التنقّلات بين الصفحات: الشبكة أولًا، ثم الكاش، ثم غلاف القارئ دون اتصال.
  if (request.mode === "navigate") {
    event.respondWith(navigationHandler(request));
    return;
  }

  // الأصول الثابتة (JS/CSS/خطوط/أيقونات): الكاش أولًا.
  event.respondWith(cacheFirst(request));
});

// هل هذا طلب حمولة RSC؟ يرسل Next.js ترويسة RSC: 1 و/أو المعامل ?_rsc أثناء
// التنقّل/الجلب المسبق داخل التطبيق.
function isRscRequest(request, url) {
  return request.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
}

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

// الشبكة فقط، ومع فشلها خطأ شبكة نظيف (يدفع Next.js للتراجع إلى تنقّل كامل).
async function networkOrError(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return Response.error();
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

// التنقّلات: جرّب الشبكة، ثم الصفحة المخزَّنة، ثم غلاف القارئ دون اتصال.
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

// يخزّن مسبقًا صفحة /offline وكل أصولها الثابتة (JS/CSS/الخط) بقراءة روابط
// /_next/static من HTML الصفحة، ثم روابط الخطوط من ملفات CSS. كله «أفضل جهد»:
// أي فشل جزئي لا يُسقِط التثبيت — سيُكمَّل التخزين عند أول زيارة أونلاين.
async function precacheOfflineShell() {
  try {
    const cache = await caches.open(STATIC_CACHE);

    const response = await fetch(OFFLINE_URL, { cache: "reload" });
    if (!response || !response.ok) return;
    await cache.put(OFFLINE_URL, response.clone());

    const html = await response.text();
    const assetUrls = extractNextAssets(html);

    // خزّن كل أصل على حدة حتى لا يُفشل رابطٌ واحد الباقي.
    await Promise.all(assetUrls.map((u) => cache.add(u).catch(() => {})));

    // استخرج روابط الخطوط من ملفات CSS المخزَّنة وخزّنها أيضًا.
    const cssUrls = assetUrls.filter((u) => u.endsWith(".css"));
    await Promise.all(
      cssUrls.map(async (cssUrl) => {
        try {
          const cssRes = await cache.match(cssUrl);
          if (!cssRes) return;
          const css = await cssRes.text();
          const fontUrls = extractCssFontUrls(css);
          await Promise.all(fontUrls.map((u) => cache.add(u).catch(() => {})));
        } catch {
          // تجاهل — الخطوط ترجع لبديل النظام إن تعذّر تخزينها.
        }
      })
    );
  } catch {
    // تعذّر التخزين المسبق (غالبًا لا اتصال) — سيُخزَّن عند أول زيارة أونلاين.
  }
}

// يستخرج روابط أصول Next الثابتة (نفس الأصل) من سمات src/href في HTML.
function extractNextAssets(html) {
  const urls = new Set();
  const re = /(?:src|href)="([^"]+)"/g;
  let match;
  while ((match = re.exec(html)) !== null) {
    const value = match[1];
    if (value.startsWith("/_next/")) urls.add(value);
  }
  return [...urls];
}

// يستخرج روابط الخطوط (woff/woff2) من محتوى CSS ويحوّلها لمسارات مطلقة.
function extractCssFontUrls(css) {
  const urls = new Set();
  const re = /url\(\s*["']?([^"')]+\.woff2?[^"')]*)["']?\s*\)/g;
  let match;
  while ((match = re.exec(css)) !== null) {
    try {
      const abs = new URL(match[1], self.location.origin);
      if (abs.origin === self.location.origin) urls.add(abs.pathname + abs.search);
    } catch {
      // رابط غير صالح — تجاهله.
    }
  }
  return [...urls];
}
