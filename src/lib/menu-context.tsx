"use client";

import { createContext, useContext, useState, type Dispatch, type SetStateAction } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// حالة درج القائمة الجانبي مشتركة عالميًا: الشاشات الغامرة على الموبايل تُخفي
// شريط Navbar (راجع AppChrome) فلا يبقى لها زرّ لفتح القائمة إلا عبر MenuButton
// الخاص بكل شاشة — لكن الدرج نفسه (المُعرَّف داخل Navbar) يجب أن يبقى مُركَّبًا
// دومًا بصرف النظر عن إخفاء الشريط، وأن تتشارك كل الأزرار حالة الفتح نفسها.
// ─────────────────────────────────────────────────────────────────────────────

interface MenuContextValue {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

const MenuContext = createContext<MenuContextValue | null>(null);

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <MenuContext.Provider value={{ open, setOpen }}>{children}</MenuContext.Provider>;
}

export function useMenu(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used within MenuProvider");
  return ctx;
}
