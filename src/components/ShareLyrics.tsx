"use client";

import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { btnSecondary } from "@/lib/ui";

interface ShareLyricsProps {
  /** Absolute URL to this nasheed's page. */
  shareUrl: string;
  /** Nasheed title — used as the share sheet title. */
  title: string;
  /** Pre-formatted WhatsApp-friendly text (title + lyrics + tags). */
  shareText: string;
}

export function ShareLyrics({ shareUrl, title, shareText }: ShareLyricsProps) {
  const [shared, setShared] = useState(false);
  const [copied, setCopied] = useState(false);

  async function shareLink() {
    // Prefer the native share sheet (mobile) so users land straight in WhatsApp;
    // fall back to copying the link on desktop / unsupported browsers.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch {
        // User dismissed the sheet, or share failed — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function copyLyrics() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={shareLink}
        aria-label="مشاركة رابط الأنشودة"
        title={shared ? "تم نسخ الرابط" : "مشاركة رابط الأنشودة"}
        className={`${btnSecondary} h-11 w-11 !p-0`}
      >
        {shared ? (
          <Check className="h-6 w-6 text-emerald-700" aria-hidden="true" />
        ) : (
          <Share2 className="h-6 w-6" aria-hidden="true" />
        )}
      </button>

      <button
        type="button"
        onClick={copyLyrics}
        aria-label="نسخ الأنشودة"
        title={copied ? "تم النسخ" : "نسخ الأنشودة (منسّقة لواتساب)"}
        className={`${btnSecondary} h-11 w-11 !p-0 ${copied ? "border-emerald-300 text-emerald-700" : ""}`}
      >
        {copied ? (
          <Check className="h-6 w-6 text-emerald-700" aria-hidden="true" />
        ) : (
          <Copy className="h-6 w-6" aria-hidden="true" />
        )}
      </button>
    </>
  );
}
