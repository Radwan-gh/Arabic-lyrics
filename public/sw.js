// Service worker لتطبيق «أناشيد» — يدعم التثبيت (PWA) والعمل دون اتصال.
//
// المبدأ: لا صفحات خاصة بوضع «دون اتصال». يخزّن الـ SW صفحات التطبيق نفسها (HTML
// الحقيقي لكل مسار، مع أصولها الثابتة) ويخدمها عند انقطاع الشبكة، فيرى المستخدم
// الواجهة ذاتها دون أي فرق.
//
// - التنقّلات: الشبكة أولًا (وتُحدَّث النسخة المخزَّنة)، ثم الصفحة المخزَّنة.
// - التنقّل داخل التطبيق (حمولات RSC): الشبكة فقط؛ عند فشلها يُرجَع خطأ شبكة فيتراجع
//   Next.js إلى تنقّل كامل للمسار نفسه، يُخدَم من الصفحة المخزَّنة.
// - التخزين المسبق: يرسل العميل قائمة الصفحات مع «نسخة» لكل منها (WARM_PAGES —
//   راجع src/lib/offline.ts)، فيجلب الـ SW ما تغيّر فقط مع أصوله.
// - صفحات HTML تعكس جلسة المستخدم (مفضّلته، أزرار التعديل…)، فيُمسح كاشها مع
//   بياناته الخاصة عند نجاح تسجيل الدخول أو الخروج.
// - لا يُخزَّن: الطلبات عبر-الأصل، وطلبات التعديل، ومسارات /api/* عدا لقطات القراءة.

const VERSION = "v6";
const STATIC_CACHE = `anaasheed-static-${VERSION}`; // أصول ثابتة (JS/CSS/خطوط/أيقونات)
const PAGES_CACHE = `anaasheed-pages-${VERSION}`; // صفحات HTML (خاصة بالجلسة)
const DATA_CACHE = `anaasheed-data-${VERSION}`; // لقطات JSON
const KNOWN_CACHES = [STATIC_CACHE, PAGES_CACHE, DATA_CACHE];

// لقطات JSON تُخزَّن (الشبكة أولًا) لتعمل دون اتصال.
const DATA_PATHS = ["/api/public/lyrics", "/api/offline/me", "/api/tags"];
const PRIVATE_DATA_PATH = "/api/offline/me";
const AUTH_PATHS = ["/api/auth/login", "/api/auth/logout"];

// يطابق الثوابت في src/lib/offline.ts.
const WARM_PAGES_MESSAGE = "WARM_PAGES";
const DATA_CHANGED_MESSAGE = "DATA_CHANGED";
const PRECACHE_HEADER = "x-sw-precache";

// نسخة الصفحة المخزَّنة تُحفظ في ترويسة على الاستجابة نفسها.
const PAGE_VERSION_HEADER = "x-sw-page-version";
const WARM_CONCURRENCY = 3;
const DATA_CHANGED_DELAY_MS = 1500;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
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

self.addEventListener("message", (event) => {
  const data = event.data;
  if (data && data.type === WARM_PAGES_MESSAGE && Array.isArray(data.pages)) {
    event.waitUntil(enqueueWarm(data.pages));
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  // طلبات التعديل: تمرّ إلى الشبكة كما هي، ونراقب نجاحها لصيانة الكاش.
  if (request.method !== "GET") {
    if (url.pathname.startsWith("/api/")) {
      event.respondWith(handleMutation(event, url));
    }
    return;
  }

  if (DATA_PATHS.includes(url.pathname)) {
    event.respondWith(networkFirstData(request));
    return;
  }

  // بقية مسارات /api/*: تمرير دون تخزين (مصادقة/قراءات ديناميكية).
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // حمولات RSC (تنقّل داخل التطبيق): الشبكة، وعند فشلها خطأ شبكة نظيف ليتراجع
  // Next.js إلى تنقّل كامل يُلتقط أدناه. لا نخزّن حمولات RSC.
  if (isRscRequest(request, url)) {
    event.respondWith(networkOrError(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }

  // الأصول الثابتة (JS/CSS/خطوط/أيقونات): الكاش أولًا.
  event.respondWith(cacheFirst(request));
});

// يرسل Next.js ترويسة RSC: 1 و/أو المعامل ?_rsc أثناء التنقّل/الجلب المسبق.
function isRscRequest(request, url) {
  return request.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
}

// ─── التنقّلات ───────────────────────────────────────────────────────────────

async function handleNavigation(event) {
  const { request } = event;
  try {
    const response = await fetch(request);
    if (isCacheablePage(response)) {
      const copy = response.clone();
      event.waitUntil(
        (async () => {
          const cache = await caches.open(PAGES_CACHE);
          // زيارة حيّة = محتوى حديث؛ نُبقي نسخته المعروفة إن وُجدت ليتجنّب
          // التخزين المسبق إعادة جلبه بلا داعٍ.
          const previous = await cache.match(request.url, { ignoreVary: true });
          await putPage(cache, request.url, copy, previous?.headers.get(PAGE_VERSION_HEADER) ?? "");
        })().catch(() => {})
      );
    }
    return response;
  } catch (error) {
    const cached = await matchPage(request.url);
    return cached || unavailableResponse();
  }
}

// الصفحة المخزَّنة للرابط تمامًا، وإلا للمسار نفسه بلا معاملات (مثلًا ‎/?q=…‎ تُخدَم
// من الرئيسية، فتطبّق الصفحة معاملات الرابط من لقطة الأناشيد).
async function matchPage(href) {
  const cache = await caches.open(PAGES_CACHE);
  const url = new URL(href);
  const options = { ignoreVary: true };
  return (
    (await cache.match(url.href, options)) ||
    (url.search ? await cache.match(url.origin + url.pathname, options) : undefined) ||
    (await cache.match(url.href, { ...options, ignoreSearch: true }))
  );
}

function isCacheablePage(response) {
  return (
    !!response &&
    response.ok &&
    response.type === "basic" &&
    !response.redirected &&
    (response.headers.get("Content-Type") || "").includes("text/html")
  );
}

// يخزّن الصفحة مع نسختها. تُحذف ترويسات لا تصحّ على نسخة مُعاد بناؤها (الجسم
// مفكوك الضغط مسبقًا) أو تعيق المطابقة (Vary).
async function putPage(cache, href, response, version) {
  const body = await response.text();
  const headers = new Headers(response.headers);
  ["Content-Encoding", "Content-Length", "Vary"].forEach((h) => headers.delete(h));
  headers.set(PAGE_VERSION_HEADER, version);
  await cache.put(href, new Response(body, { status: response.status, statusText: response.statusText, headers }));
  return body;
}

// لا صفحة مخزَّنة لهذا المسار (مثل صفحات الإضافة والإدارة التي تتطلّب اتصالًا).
function unavailableResponse() {
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>أناشيد</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
font-family:system-ui,sans-serif;background:#f7f7f4;color:#14211c;text-align:center;padding:24px}
a{display:inline-block;margin-top:16px;padding:10px 20px;border-radius:999px;background:#047857;
color:#fff;text-decoration:none}</style></head><body><div><p>هذه الصفحة تتطلّب اتصالًا بالإنترنت.</p>
<a href="javascript:history.back()">رجوع</a></div></body></html>`;
  return new Response(html, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// ─── التخزين المسبق للصفحات ──────────────────────────────────────────────────

// تُنفَّذ طلبات التهيئة واحدًا تلو الآخر؛ الطلب اللاحق يتخطّى ما خزّنه السابق.
let warmQueue = Promise.resolve();
// يزداد مع كل تغيّر للجلسة، فتتوقّف أي جولة تهيئة بدأت للجلسة السابقة.
let sessionGeneration = 0;

function enqueueWarm(pages) {
  warmQueue = warmQueue.then(() => warmPages(pages)).catch(() => {});
  return warmQueue;
}

async function warmPages(pages) {
  const generation = sessionGeneration;
  const cache = await caches.open(PAGES_CACHE);
  const stale = [];
  for (const page of pages) {
    if (!page || typeof page.url !== "string") continue;
    const href = new URL(page.url, self.location.origin).href;
    const cached = await cache.match(href, { ignoreVary: true });
    if (!cached || cached.headers.get(PAGE_VERSION_HEADER) !== String(page.version)) {
      stale.push({ href, version: String(page.version) });
    }
  }
  if (!stale.length) return;

  const seenAssets = new Set();
  let index = 0;
  const worker = async () => {
    while (index < stale.length && generation === sessionGeneration) {
      const page = stale[index++];
      try {
        // بلا اتصال: أوقف الجولة؛ تُستكمل في التهيئة التالية.
        if (!(await warmPage(cache, page, seenAssets))) return;
      } catch {
        return;
      }
    }
  };
  await Promise.all(Array.from({ length: WARM_CONCURRENCY }, worker));
}

// يُرجِع false عند فشل الشبكة (لا اتصال)، وtrue فيما عدا ذلك.
async function warmPage(cache, page, seenAssets) {
  let response;
  try {
    response = await fetch(page.href, {
      credentials: "same-origin",
      headers: { [PRECACHE_HEADER]: "1" },
    });
  } catch {
    return false;
  }
  if (!isCacheablePage(response)) return true;
  const html = await putPage(cache, page.href, response, page.version);
  await cacheAssets(html, seenAssets);
  return true;
}

// يخزّن أصول Next الثابتة المذكورة في HTML الصفحة (JS/CSS) وخطوط ملفات CSS، حتى
// تعمل الصفحة دون اتصال وإن لم يزرها المستخدم قط. «أفضل جهد»: الفشل يُتجاهل.
async function cacheAssets(html, seenAssets) {
  const cache = await caches.open(STATIC_CACHE);
  const fresh = extractNextAssets(html).filter((u) => !seenAssets.has(u));
  fresh.forEach((u) => seenAssets.add(u));
  await Promise.all(
    fresh.map(async (assetUrl) => {
      try {
        let response = await cache.match(assetUrl);
        if (!response) {
          await cache.add(assetUrl);
          response = await cache.match(assetUrl);
        }
        if (!response || !assetUrl.endsWith(".css")) return;
        const fonts = extractCssFontUrls(await response.text()).filter((u) => !seenAssets.has(u));
        fonts.forEach((u) => seenAssets.add(u));
        await Promise.all(
          fonts.map(async (fontUrl) => {
            if (!(await cache.match(fontUrl))) await cache.add(fontUrl).catch(() => {});
          })
        );
      } catch {
        // أصل تعذّر تخزينه — يُخزَّن عند أول طلب له أونلاين.
      }
    })
  );
}

// روابط أصول Next الثابتة (نفس الأصل) من سمات src/href في HTML.
function extractNextAssets(html) {
  const urls = new Set();
  const re = /(?:src|href)="(\/_next\/static\/[^"]+)"/g;
  let match;
  while ((match = re.exec(html)) !== null) urls.add(match[1]);
  return [...urls];
}

// روابط الخطوط (woff/woff2) في CSS كمسارات مطلقة من نفس الأصل.
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

// ─── طلبات التعديل ───────────────────────────────────────────────────────────

async function handleMutation(event, url) {
  const response = await fetch(event.request);
  if (response.ok) {
    if (AUTH_PATHS.includes(url.pathname)) {
      // تغيّرت الجلسة: الصفحات المخزَّنة تعكس المستخدم السابق. يُمسح كاشها قبل
      // إرجاع الاستجابة، فتبدأ تهيئة الجلسة الجديدة من كاش نظيف.
      await clearSessionCaches();
    } else {
      event.waitUntil(notifyDataChanged());
    }
  }
  return response;
}

async function clearSessionCaches() {
  sessionGeneration++;
  await caches.delete(PAGES_CACHE);
  const data = await caches.open(DATA_CACHE);
  await data.delete(PRIVATE_DATA_PATH, { ignoreSearch: true });
}

// يُبلغ الصفحات المفتوحة بتغيّر البيانات لتعيد التهيئة فتُحدَّث الصفحات المتأثّرة.
// مُؤجَّل ومُجمَّع: عدّة تعديلات متتالية (مثل تبديل التفضيل) تُطلق تهيئة واحدة.
let dataChangedTimer = null;
let dataChangedDone = null;
let dataChangedPromise = null;

function notifyDataChanged() {
  if (dataChangedTimer) clearTimeout(dataChangedTimer);
  if (!dataChangedPromise) {
    dataChangedPromise = new Promise((resolve) => (dataChangedDone = resolve));
  }
  dataChangedTimer = setTimeout(async () => {
    const done = dataChangedDone;
    dataChangedTimer = null;
    dataChangedPromise = null;
    const windows = await self.clients.matchAll({ type: "window" });
    windows.forEach((client) => client.postMessage({ type: DATA_CHANGED_MESSAGE }));
    done();
  }, DATA_CHANGED_DELAY_MS);
  return dataChangedPromise;
}

// ─── استراتيجيات عامة ────────────────────────────────────────────────────────

// الشبكة أولًا مع رجوع للكاش عند انقطاعها — للقطات JSON.
async function networkFirstData(request) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true, ignoreVary: true });
    if (cached) return cached;
    throw error;
  }
}

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
  const response = await fetch(request);
  if (response && response.ok && response.type === "basic") {
    cache.put(request, response.clone());
  }
  return response;
}
