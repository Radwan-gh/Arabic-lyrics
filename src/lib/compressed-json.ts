import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import { NextResponse } from "next/server";

// أقل من هذا لا يستحق الضغط (الترويسات أكبر من الوفر).
const MIN_COMPRESS_BYTES = 1024;

/**
 * استجابة JSON مضغوطة (brotli، وإلا gzip) حسب ما يقبله المتصفح. Next.js لا يضغط
 * استجابات مسارات الـ API (على خلاف صفحات HTML)، وبيانات المزامنة للقراءة دون
 * اتصال كبيرة (~0.9 MB دون ضغط)، فيُضغط هنا صراحةً. المتصفح يفكّ الضغط تلقائيًا.
 */
export function compressedJson(request: Request, data: unknown): Response {
  const body = Buffer.from(JSON.stringify(data));
  const accepts = request.headers.get("accept-encoding") ?? "";
  if (body.length < MIN_COMPRESS_BYTES) return NextResponse.json(data);

  const headers = {
    "Content-Type": "application/json",
    // الوسطاء (CDN/بروكسي) يخزّنون نسخة لكل ترميز.
    Vary: "Accept-Encoding",
  };
  if (/\bbr\b/.test(accepts)) {
    const compressed = brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } });
    return new Response(compressed, { headers: { ...headers, "Content-Encoding": "br" } });
  }
  if (/\bgzip\b/.test(accepts)) {
    return new Response(gzipSync(body), { headers: { ...headers, "Content-Encoding": "gzip" } });
  }
  return new Response(body, { headers });
}
