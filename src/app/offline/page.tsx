import type { Metadata } from "next";
import { OfflineShell } from "@/components/OfflineShell";

// ليست وجهة تصفّح حقيقية — لا رابط إليها في التنقّل. الـ service worker وحده
// يخدمها (راجع public/sw.js) كغلاف احتياطي عند انقطاع الشبكة لأي مسار حقيقي
// (/، /lyrics/[id]، /favorites، /playlists...) لم يُخزَّن بعينه؛ يبقى المسار
// الحقيقي في شريط العنوان، وOfflineShell يقرأه ويعرض مكوّن الصفحة الحقيقية
// نفسه. metadata محايدة عمدًا حتى لا تُفهرَس كصفحة مستقلّة.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return <OfflineShell />;
}
