"use client";

import Link from "next/link";
import { ChevronRight, Settings2 } from "lucide-react";
import { btnSecondary, focusRing } from "@/lib/ui";
import { PlaylistCollapsibleBody } from "@/components/PlaylistCollapsibleBody";
import { ReadingControlsBar } from "@/components/ReadingControlsBar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { OfflineEmptyState } from "@/components/OfflineEmptyState";
import {
  useOfflinePlaylistView,
  type PlaylistViewSsrData,
} from "@/hooks/use-offline-playlist-view";

interface Props {
  id: string;
  ssr: PlaylistViewSsrData | null;
}

/** يعمل للقراءة دون اتصال أيضًا: `ssr` يُمرَّر null حين لم تُصيَّر الصفحة على
 * الخادم إطلاقًا (غلاف احتياطي)، فتُقرأ الوصلة من اللقطة المخزَّنة بمعرِّفها. */
export function PlaylistReadView({ id, ssr }: Props) {
  const { view, online, found, loggedIn, sourcedFromCache } = useOfflinePlaylistView(ssr, id);

  if (!loggedIn) {
    return <OfflineEmptyState>سجّل الدخول وأنت متصل بالإنترنت لحفظ قوائمك للقراءة دون اتصال.</OfflineEmptyState>;
  }

  if (!found || !view) {
    return (
      <OfflineEmptyState>
        هذه القائمة غير محفوظة على جهازك.
        <span className="mt-3 block">
          <Link href="/playlists" className={`font-medium text-emerald-700 hover:underline ${focusRing}`}>
            ▸ كل القوائم
          </Link>
        </span>
      </OfflineEmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <OfflineBanner online={online} sourcedFromCache={sourcedFromCache} />

      <div className="flex flex-col gap-2 border-b border-neutral-200 pb-4">
        <Link
          href={`/playlists/${view.id}`}
          className={`inline-flex items-center gap-1 rounded-sm text-sm text-neutral-600 hover:text-emerald-700 ${focusRing}`}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" /> إدارة الوصلة
        </Link>
        <h1 className="text-3xl font-extrabold">{view.title}</h1>
        {view.description && <p className="text-neutral-600">{view.description}</p>}
        <p className="text-sm text-neutral-500">
          {view.items.length} نشيد · {view.isPublic ? "عامة" : "خاصة"}
        </p>
      </div>

      <ReadingControlsBar />

      <PlaylistCollapsibleBody items={view.items} />

      <div>
        <Link href={`/playlists/${view.id}`} className={`${btnSecondary} px-4 py-2`}>
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          إدارة الوصلة
        </Link>
      </div>
    </div>
  );
}
