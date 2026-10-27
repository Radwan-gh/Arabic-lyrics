import { LyricsDetailSkeleton } from "@/components/LyricsDetailSkeleton";

/** يسمح لـ Next.js بجلب صفحة النشيد مسبقاً حتى هذه الحدود ويُظهر هيكلها فور النقر. */
export default function LyricsLoading() {
  return <LyricsDetailSkeleton />;
}
