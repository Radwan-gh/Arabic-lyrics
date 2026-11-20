"use client";

import { useSyncExternalStore } from "react";
import { getSiteTheme, subscribeSiteTheme, type SiteTheme } from "@/lib/theme";

/** مظهر الموقع الحالي كحالة React، يتحدّث عند كل تغيير (القائمة، النظام، تبويب آخر). */
export function useSiteTheme(): SiteTheme {
  return useSyncExternalStore(subscribeSiteTheme, getSiteTheme, () => "light");
}
