import type { Role } from "@prisma/client";

export interface LyricsViewer {
  userId: string;
  role: Role;
}

/** صلاحية تعديل/حذف نشيد — القاعدة نفسها على الخادم وعلى الجهاز (دون اتصال). */
export function canModifyLyrics(viewer: LyricsViewer | null, createdById: string | null): boolean {
  return !!viewer && (viewer.role === "ADMIN" || (viewer.role === "EDITOR" && viewer.userId === createdById));
}
