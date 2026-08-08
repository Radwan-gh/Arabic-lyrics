// Service worker بسيط لتطبيق «أناشيد».
// الغرض الأساسي: تحقيق شرط قابلية التثبيت (PWA) في المتصفحات عبر وجود fetch handler،
// مع استراتيجية network-first آمنة لا تخزّن استجابات المصادقة أو مسارات الـ API إطلاقًا،
// حتى لا يُكسَر تسجيل الدخول ولا تُعرض بيانات قديمة.

const CACHE_NAME = "anaasheed-static-v1";

self.addEventListener("install", () => {
  // فعّل النسخة الجديدة فورًا دون انتظار إغلاق كل التبويبات.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // احذف أي كاش قديم من نسخة سابقة.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // مرّر مباشرةً للشبكة (بدون تدخل ولا تخزين):
  // - أي طلب ليس GET (POST/PUT/DELETE ...).
  // - الطلبات خارج نطاق الموقع نفسه.
  // - مسارات الـ API ومسارات المصادقة.
  const isSameOrigin = url.origin === self.location.origin;
  const isApi = url.pathname.startsWith("/api/");
  if (request.method !== "GET" || !isSameOrigin || isApi) {
    return; // دع المتصفح يتولى الطلب افتراضيًا.
  }

  // استراتيجية network-first: جرّب الشبكة أولًا، وخزّن الأصول الثابتة فقط،
  // واستعمل الكاش كنسخة احتياطية عند انقطاع الشبكة.
  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(request);
        // خزّن فقط الأصول الثابتة الناجحة (نفس الأصل) في الكاش.
        if (
          networkResponse &&
          networkResponse.ok &&
          networkResponse.type === "basic"
        ) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        // لا شبكة: حاول الكاش.
        const cached = await caches.match(request);
        if (cached) {
          return cached;
        }
        // كملاذ أخير للتنقلات، أعِد رسالة offline بسيطة.
        if (request.mode === "navigate") {
          return new Response(
            "<!doctype html><html lang=\"ar\" dir=\"rtl\"><meta charset=\"utf-8\">" +
              "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
              "<title>غير متصل</title>" +
              "<body style=\"font-family:sans-serif;display:flex;min-height:100vh;" +
              "align-items:center;justify-content:center;margin:0;background:#fafafa;" +
              "color:#171717;text-align:center;padding:24px\">" +
              "<div><h1 style=\"color:#047857\">لا يوجد اتصال بالإنترنت</h1>" +
              "<p>يحتاج تطبيق «أناشيد» إلى اتصال بالشبكة. أعد المحاولة بعد عودة الاتصال.</p>" +
              "</div></body></html>",
            { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 }
          );
        }
        throw error;
      }
    })()
  );
});
