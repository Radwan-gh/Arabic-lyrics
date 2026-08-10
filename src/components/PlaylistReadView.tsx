"use client";

import Link from "next/link";
import { ChevronRight, Settings2 } from "lucide-react";
import { btnSecondary, focusRing } from "@/lib/ui";
import { PlaylistCollapsibleBody, type PlaylistBodyItem } from "@/components/PlaylistCollapsibleBody";

interface Props {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  items: PlaylistBodyItem[];
}

export function PlaylistReadView({ id, title, description, isPublic, items }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 border-b border-neutral-200 pb-4">
        <Link
          href={`/playlists/${id}`}
          className={`inline-flex items-center gap-1 rounded-sm text-sm text-neutral-600 hover:text-emerald-700 ${focusRing}`}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" /> إدارة الوصلة
        </Link>
        <h1 className="text-3xl font-extrabold">{title}</h1>
        {description && <p className="text-neutral-600">{description}</p>}
        <p className="text-sm text-neutral-500">
          {items.length} نشيد · {isPublic ? "عامة" : "خاصة"}
        </p>
      </div>

      <PlaylistCollapsibleBody items={items} />

      <div>
        <Link href={`/playlists/${id}`} className={`${btnSecondary} px-4 py-2`}>
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          إدارة الوصلة
        </Link>
      </div>
    </div>
  );
}
