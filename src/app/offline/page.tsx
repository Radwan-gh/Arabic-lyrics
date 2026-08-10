import type { Metadata } from "next";
import { OfflineReader } from "@/components/OfflineReader";

export const metadata: Metadata = {
  title: "القراءة دون اتصال — أناشيد",
  description: "تصفّح واقرأ الأناشيد ومفضّلتك وقوائمك دون اتصال بالإنترنت.",
};

// صفحة القارئ دون اتصال: هيكل خفيف يُصيَّر على الخادم، والقراءة الفعلية تتم في
// العميل من اللقطات المخزَّنة عبر الـ service worker.
export default function OfflinePage() {
  return <OfflineReader />;
}
