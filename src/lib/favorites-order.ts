"use client";

/** يحفظ الترتيب المخصّص الكامل للمفضّلة. يُستخدم من قائمتَي الأسهم (سطح المكتب) والسحب (الموبايل). */
export function persistFavoritesOrder(order: string[]): void {
  fetch("/api/favorites", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order }),
  }).catch(() => {});
}
