"use client";

import { useCallback, useEffect, useState } from "react";

const SWIPE_HINT_KEY = "arabic-lyrics:swipe-delete-hint-seen";

/**
 * تلميح «اسحب نحو اليمين للحذف» على الموبايل، يظهر حتى يُغلقه المستخدم أو يحذف
 * أول نشيد بالسحب، ثم لا يعود (يُحفظ في localStorage على هذا الجهاز). لا يظهر
 * قبل قراءة التخزين (تصيير الخادم بلا تلميح)، ولا إن تعذّرت القراءة — تلميح
 * يتكرّر في كل زيارة أسوأ من غيابه.
 */
export function useSwipeHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      setShow(localStorage.getItem(SWIPE_HINT_KEY) !== "1");
    } catch {
      setShow(false);
    }
  }, []);

  const dismiss = useCallback(() => {
    setShow(false);
    try {
      localStorage.setItem(SWIPE_HINT_KEY, "1");
    } catch {
      // تخزين غير متاح (تصفّح خاص): يُخفى التلميح لهذه الجلسة فقط.
    }
  }, []);

  return { show, dismiss };
}
