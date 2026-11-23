"use client";

import { PlaylistReadShell } from "@/components/PlaylistReadShell";
import type { PlaylistBodyItem } from "@/components/PlaylistStackedBody";

interface Props {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  items: PlaylistBodyItem[];
}

/** قراءة الوصلة لمالكها (‎/playlists/[id]/view‎) — التخطيط المشترك مع الرابط العام. */
export function PlaylistReadView({ id, title, description, isPublic, items }: Props) {
  return (
    <PlaylistReadShell
      title={title}
      description={description}
      meta={`${items.length.toLocaleString("ar-EG")} نشيداً · ${isPublic ? "عامة" : "خاصة"}`}
      back={{ href: `/playlists/${id}`, label: "العودة إلى الوصلة" }}
      items={items}
    />
  );
}
