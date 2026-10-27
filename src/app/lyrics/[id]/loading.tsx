/**
 * هيكل مؤقت لصفحة النشيد يظهر فور النقر ريثما يصل المحتوى من الخادم، ويسمح
 * لـ Next.js بجلب الصفحة مسبقاً حتى هذه الحدود. يحاكي تخطيطَي الموبايل وسطح المكتب.
 */
const bar = "animate-pulse rounded-lg bg-neutral-200";

function LyricLinesSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {["w-11/12", "w-9/12", "w-10/12", "w-8/12", "w-11/12", "w-7/12", "w-10/12", "w-9/12"].map((w, i) => (
        <div key={i} className={`h-5 ${w} ${bar}`} />
      ))}
    </div>
  );
}

export default function LyricsLoading() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">جارٍ تحميل النشيد…</span>

      <div className="flex min-h-dvh flex-col sm:hidden">
        <div className="flex h-[60px] items-center px-3 py-2">
          <div className={`h-9 w-9 ${bar}`} />
        </div>
        <div className="flex-1 px-6 pb-4 pt-1">
          <div className={`h-9 w-2/3 ${bar}`} />
          <div className={`mt-3 h-4 w-1/3 ${bar}`} />
          <div className="mt-[22px]">
            <LyricLinesSkeleton />
          </div>
        </div>
      </div>

      <div className="hidden rounded-xl border border-neutral-200 bg-white px-3 py-5 shadow-sm sm:block sm:p-6">
        <div className="mb-4 flex flex-col gap-2 border-b border-neutral-100 pb-4">
          <div className={`h-8 w-1/2 ${bar}`} />
          <div className={`h-4 w-1/4 ${bar}`} />
          <div className={`h-3 w-1/3 ${bar}`} />
        </div>
        <LyricLinesSkeleton />
      </div>
    </div>
  );
}
