"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Heart } from "lucide-react";
import { btnSecondary, focusRing } from "@/lib/ui";

interface FavoriteButtonProps {
  lyricsId: string;
  initialFavorited: boolean;
  /** "button" = labelled action (detail page); "icon" = compact heart (cards). */
  variant?: "button" | "icon";
  /** Refresh the server component after a change — used by the favorites list so
   * an un-favorited item drops out and pagination stays correct. */
  refreshOnToggle?: boolean;
}

export function FavoriteButton({
  lyricsId,
  initialFavorited,
  variant = "button",
  refreshOnToggle = false,
}: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function toggle() {
    if (pending) return;
    const next = !favorited;
    setPending(true);
    setFavorited(next); // optimistic
    try {
      const res = await fetch("/api/favorites", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lyricsId }),
      });
      if (!res.ok) {
        setFavorited(!next); // revert
        return;
      }
      if (refreshOnToggle) router.refresh();
    } catch {
      setFavorited(!next); // revert
    } finally {
      setPending(false);
    }
  }

  const label = favorited ? "إزالة من المفضلة" : "أضف إلى المفضلة";

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={favorited}
        aria-label={label}
        title={label}
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg leading-none transition-colors disabled:opacity-50 ${
          favorited ? "text-emerald-700 hover:bg-emerald-50" : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
        } ${focusRing}`}
      >
        <Heart className={`h-5 w-5 ${favorited ? "fill-current" : ""}`} aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={favorited}
      aria-label={label}
      title={label}
      className={`${btnSecondary} h-10 w-10 p-0 ${favorited ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : ""}`}
    >
      <Heart className={`h-5 w-5 ${favorited ? "fill-current" : ""}`} aria-hidden="true" />
    </button>
  );
}
