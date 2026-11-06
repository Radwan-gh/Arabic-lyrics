"use client";

import { useCallback, useEffect, useState } from "react";

const SWIPE_HINT_KEY = "arabic-lyrics:swipe-delete-hint-seen";

let knownShow: boolean | null = null;

/**
 * تلميح «اسحب نحو اليمين للحذف» على الموبايل، يظهر حتى يُغلقه المستخدم أو يحذف
 * أول نشيد بالسحب، ثم لا يعود (يُحفظ في localStorage على هذا الجهاز). لا يظهر
 * قبل قراءة التخزين (تصيير الخادم بلا تلميح)، ولا إن تعذّرت القراءة — تلميح
 * يتكرّر في كل زيارة أسوأ من غيابه.
 */
export function useSwipeHint() {
  // بعد أول قراءة تُعرف القيمة في الذاكرة، فيُصيَّر بها مباشرةً أيّ تركيب لاحق (رجوع
  // إلى القائمة): ظهور التلميح بعد التركيب يُزيح القائمة عن موضعها المستعاد.
  const [show, setShow] = useState(() => knownShow ?? false);

  useEffect(() => {
    try {
      knownShow = localStorage.getItem(SWIPE_HINT_KEY) !== "1";
    } catch {
      knownShow = false;
    }
    setShow(knownShow);
  }, []);

  const dismiss = useCallback(() => {
    knownShow = false;
    setShow(false);
    try {
      localStorage.setItem(SWIPE_HINT_KEY, "1");
    } catch {
      // تخزين غير متاح (تصفّح خاص): يُخفى التلميح لهذه الجلسة فقط.
    }
  }, []);

  return { show, dismiss };
}
