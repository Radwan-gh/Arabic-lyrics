"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RemovedFeedItem } from "@/lib/use-lyrics-feed";

/** مهلة التراجع قبل إرسال الحذف إلى الخادم. */
export const UNDO_DELETE_MS = 5000;

export interface DeleteToastState {
  kind: "deleted" | "error";
  id: string;
  title: string;
  /** نُقل التركيز إلى الإشعار (الحذف جرى من لوحة المفاتيح، فلا يضيع التركيز). */
  focus: boolean;
}

interface UseUndoableDeleteArgs {
  removeItem: (id: string) => RemovedFeedItem | null;
  restoreItem: (removed: RemovedFeedItem) => void;
  confirmRemoved: () => void;
}

interface Pending {
  removed: RemovedFeedItem;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * حذف سريع من قائمة الأناشيد بلمسة واحدة، بلا نافذة تأكيد: يختفي النشيد فورًا
 * ويظهر إشعار «تراجع» لمدة UNDO_DELETE_MS، ثم يُرسل الحذف إلى الخادم. إن فشل
 * الحذف يعود النشيد إلى موضعه مع رسالة خطأ.
 *
 * حذف واحد فقط ينتظر في كل لحظة: حذفٌ جديد، أو مغادرة الصفحة، أو إخفاؤها (إغلاق
 * التطبيق على الموبايل) يُرسل المنتظِر فورًا — بـ keepalive ليكتمل الطلب حتى لو
 * أُغلقت الصفحة.
 */
export function useUndoableDelete({ removeItem, restoreItem, confirmRemoved }: UseUndoableDeleteArgs) {
  const pendingRef = useRef<Pending | null>(null);
  const [toast, setToast] = useState<DeleteToastState | null>(null);

  const send = useCallback(
    (removed: RemovedFeedItem) => {
      const { item } = removed;
      fetch(`/api/lyrics/${item.id}`, { method: "DELETE", keepalive: true })
        .then((res) => {
          if (!res.ok) throw new Error(String(res.status));
          confirmRemoved();
        })
        .catch(() => {
          restoreItem(removed);
          setToast({ kind: "error", id: item.id, title: item.title, focus: false });
        });
    },
    [confirmRemoved, restoreItem],
  );

  const flush = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingRef.current = null;
    send(pending.removed);
  }, [send]);

  const requestDelete = useCallback(
    (id: string, { focus = false }: { focus?: boolean } = {}) => {
      flush();
      const removed = removeItem(id);
      if (!removed) return;
      const timer = setTimeout(() => {
        if (pendingRef.current?.removed.item.id !== id) return;
        pendingRef.current = null;
        send(removed);
        setToast((t) => (t?.kind === "deleted" && t.id === id ? null : t));
      }, UNDO_DELETE_MS);
      pendingRef.current = { removed, timer };
      setToast({ kind: "deleted", id, title: removed.item.title, focus });
    },
    [flush, removeItem, send],
  );

  const undo = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingRef.current = null;
    restoreItem(pending.removed);
    setToast(null);
  }, [restoreItem]);

  const dismiss = useCallback(() => {
    flush();
    setToast(null);
  }, [flush]);

  // رسالة الخطأ تختفي وحدها بعد المهلة نفسها.
  useEffect(() => {
    if (toast?.kind !== "error") return;
    const timer = setTimeout(() => setToast(null), UNDO_DELETE_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // أرسِل الحذف المنتظِر عند مغادرة الصفحة أو إخفائها أو الانتقال منها داخل التطبيق.
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushRef.current();
    };
    const onPageHide = () => flushRef.current();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      flushRef.current();
    };
  }, []);

  return { toast, requestDelete, undo, dismiss };
}
