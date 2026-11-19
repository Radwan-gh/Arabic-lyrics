"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RemovedFeedItem } from "@/lib/use-lyrics-feed";

/** مهلة التراجع قبل إرسال الحذف إلى الخادم. */
export const UNDO_DELETE_MS = 5000;

export interface DeleteToastState {
  kind: "deleted" | "error";
  /** معرّف عملية الحذف (لا النشيد): يميّز إشعار كل عملية عن التي تليها. */
  key: number;
  /** عنوان النشيد حين يكون الحذف لنشيد واحد. */
  title: string;
  /** عدد الأناشيد في هذه العملية (أو عدد ما فشل حذفه في إشعار الخطأ). */
  count: number;
  /** نُقل التركيز إلى الإشعار (الحذف جرى من لوحة المفاتيح، فلا يضيع التركيز). */
  focus: boolean;
}

interface UseUndoableDeleteArgs {
  removeItem: (id: string) => RemovedFeedItem | null;
  restoreItem: (removed: RemovedFeedItem) => void;
  confirmRemoved: () => void;
}

interface Pending {
  key: number;
  /** بترتيب الإخفاء: يُرجَع بعكسه ليعود كلٌّ إلى موضعه الأصلي. */
  removed: RemovedFeedItem[];
  timer: ReturnType<typeof setTimeout>;
}

let nextKey = 1;

/**
 * حذف سريع من قائمة الأناشيد بلا نافذة تأكيد — لنشيد واحد (سحب) أو لعدة أناشيد
 * (التحديد المتعدد): تختفي فورًا ويظهر إشعار «تراجع» لمدة UNDO_DELETE_MS، ثم
 * يُرسل الحذف إلى الخادم. ما فشل حذفه يعود إلى موضعه مع رسالة خطأ.
 *
 * عملية حذف واحدة فقط تنتظر في كل لحظة: حذفٌ جديد، أو مغادرة الصفحة، أو إخفاؤها
 * (إغلاق التطبيق على الموبايل) يُرسل المنتظِر فورًا — بـ keepalive ليكتمل الطلب
 * حتى لو أُغلقت الصفحة.
 */
export function useUndoableDelete({ removeItem, restoreItem, confirmRemoved }: UseUndoableDeleteArgs) {
  const pendingRef = useRef<Pending | null>(null);
  const [toast, setToast] = useState<DeleteToastState | null>(null);

  const restoreAll = useCallback(
    (removed: RemovedFeedItem[]) => {
      for (let i = removed.length - 1; i >= 0; i--) restoreItem(removed[i]);
    },
    [restoreItem],
  );

  const send = useCallback(
    (removed: RemovedFeedItem[]) => {
      const fail = (failed: RemovedFeedItem[]) => {
        if (failed.length === 0) return;
        restoreAll(failed);
        setToast({ kind: "error", key: nextKey++, title: failed[0].item.title, count: failed.length, focus: false });
      };

      if (removed.length === 1) {
        const [only] = removed;
        fetch(`/api/lyrics/${only.item.id}`, { method: "DELETE", keepalive: true })
          .then((res) => {
            if (!res.ok) throw new Error(String(res.status));
            confirmRemoved();
          })
          .catch(() => fail(removed));
        return;
      }

      fetch("/api/lyrics/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: removed.map((r) => r.item.id) }),
        keepalive: true,
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(String(res.status));
          const data: { deleted: string[] } = await res.json();
          const deleted = new Set(data.deleted);
          for (let i = 0; i < deleted.size; i++) confirmRemoved();
          fail(removed.filter((r) => !deleted.has(r.item.id)));
        })
        .catch(() => fail(removed));
    },
    [confirmRemoved, restoreAll],
  );

  const flush = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingRef.current = null;
    send(pending.removed);
  }, [send]);

  /** يُخفي نشيدًا أو عدة أناشيد ويبدأ مهلة التراجع. */
  const requestDelete = useCallback(
    (ids: string | string[], { focus = false }: { focus?: boolean } = {}) => {
      flush();
      const removed: RemovedFeedItem[] = [];
      for (const id of Array.isArray(ids) ? ids : [ids]) {
        const r = removeItem(id);
        if (r) removed.push(r);
      }
      if (removed.length === 0) return;
      const key = nextKey++;
      const timer = setTimeout(() => {
        if (pendingRef.current?.key !== key) return;
        pendingRef.current = null;
        send(removed);
        setToast((t) => (t?.kind === "deleted" && t.key === key ? null : t));
      }, UNDO_DELETE_MS);
      pendingRef.current = { key, removed, timer };
      setToast({ kind: "deleted", key, title: removed[0].item.title, count: removed.length, focus });
    },
    [flush, removeItem, send],
  );

  const undo = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingRef.current = null;
    restoreAll(pending.removed);
    setToast(null);
  }, [restoreAll]);

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
