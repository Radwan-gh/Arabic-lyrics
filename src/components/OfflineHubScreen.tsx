"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, CloudOff } from "lucide-react";
import type { OfflineData } from "@/components/OfflineReader";
import { useInstallPrompt } from "@/lib/use-install-prompt";
import { focusRing } from "@/lib/ui";

/** شاشة «دون اتصال» الغامرة على الموبايل — نسخة مبسّطة من OfflineHub تطابق التصميم:
 * حالة النسخة (تحديث/تثبيت) ثم قائمة الأناشيد المتاحة. لا تغيّر منطق مرآة الصفحات
 * (OfflineMirror) — تلك تبقى كما هي على كل الأحجام. */
export function OfflineHubScreen({ data }: { data: OfflineData }) {
  const router = useRouter();
  const { collection, me, loading, online, reload } = data;
  const { installable, installing, install } = useInstallPrompt();

  const collectionCount = collection?.lyrics.length ?? 0;
  const favoritesCount = me?.favorites.length ?? 0;
  const playlistsCount = me?.playlists.length ?? 0;
  const ready = collection !== null && !loading;

  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f7f4] text-[#14211c]">
      {!online && (
        <div className="flex items-center gap-2 bg-[#fef3c7] px-5 py-2.5 text-sm text-[#92400e]">
          <CloudOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          لا يوجد اتصال — تعرض النسخة المحفوظة
        </div>
      )}

      <header className="flex items-center gap-2 px-3 pt-2">
        <button type="button" onClick={() => router.back()} aria-label="رجوع" className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#3c4a44] ${focusRing}`}>
          <ChevronRight className="h-[22px] w-[22px]" aria-hidden="true" />
        </button>
        <span className="text-xl font-extrabold">المحفوظ للقراءة</span>
      </header>

      <div className="flex flex-col gap-3 px-5 pb-4 pt-2">
        <div className="flex flex-col gap-2.5 rounded-2xl border border-[#e6e6e1] bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-bold">حالة النسخة</span>
            {collection?.updatedAt && (
              <span className="text-[13px] text-[#6b7670]">
                آخر تحديث {new Date(collection.updatedAt).toLocaleTimeString("ar", { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#eceeed]">
            <span className="block h-full bg-emerald-700" style={{ width: ready ? "100%" : "35%" }} />
          </div>
          <div className="text-sm text-[#5c6660]">
            {ready
              ? `${collectionCount.toLocaleString("ar-EG")} نشيداً · ${favoritesCount.toLocaleString("ar-EG")} مفضلة · ${playlistsCount.toLocaleString("ar-EG")} وصلات — جاهزة كلها`
              : "جارٍ تجهيز النسخة المحفوظة…"}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void reload()}
            disabled={!online || loading}
            className="h-12 flex-1 rounded-2xl border border-[#e6e6e1] bg-white text-[15px] font-semibold text-[#3c4a44] disabled:opacity-50"
          >
            {loading ? "جارٍ التحديث…" : "تحديث النسخة"}
          </button>
          {installable && (
            <button
              type="button"
              onClick={install}
              disabled={installing}
              className="h-12 flex-1 rounded-2xl border border-[#e6e6e1] bg-white text-[15px] font-semibold text-[#3c4a44] disabled:opacity-50"
            >
              تثبيت التطبيق
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 border-t border-[#e6e6e1] bg-white">
        <div className="bg-[#f7f7f4] px-5 py-3 text-[13px] text-[#6b7670]">متاح الآن دون اتصال</div>
        {collectionCount === 0 ? (
          <p className="p-8 text-center text-sm text-[#6b7670]">
            لم تُحفظ الأناشيد على هذا الجهاز بعد. اتصل بالإنترنت وافتح التطبيق مرة واحدة، ثم عاود المحاولة دون اتصال.
          </p>
        ) : (
          collection!.lyrics.map((l) => (
            <Link
              key={l.id}
              href={`/lyrics/${l.id}`}
              className={`flex min-h-16 items-center gap-2.5 border-b border-[#f0f0ec] px-5 py-3 ${focusRing}`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px] font-bold">{l.title}</div>
                {l.artist && <div className="mt-0.5 truncate text-[13px] text-[#6b7670]">{l.artist}</div>}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
