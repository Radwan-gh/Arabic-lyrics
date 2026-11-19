"use client";

import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from "react";
import { Trash2 } from "lucide-react";

interface SwipeToDeleteProps {
  /** عنوان النشيد — لاسم زرّ الحذف البديل لقارئ الشاشة ولوحة المفاتيح. */
  title: string;
  /** `viaKeyboard`: الحذف من الزر البديل بلوحة المفاتيح (لنقل التركيز إلى «تراجع»). */
  onDelete: (viaKeyboard: boolean) => void;
  /** تلميح أول مرة: ينزاح الصف وحده قليلًا نحو اليمين ثم يعود، كاشفًا خلفية الحذف. */
  peek?: boolean;
  /** ضغطة مطوّلة على الصف (بلا تحريك) — لبدء التحديد المتعدد. */
  onLongPress?: () => void;
  /** وضع التحديد: لا سحب ولا ضغط مطوّل، ويُترك النقر للصف نفسه. */
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

/** مسافة السحب قبل أن يُعدّ أفقيًا (لا تمريرًا عموديًا ولا لمسة). */
const SLOP_PX = 10;
/** نسبة عرض الصف التي يكفي تجاوزها عند الإفلات للحذف. */
const DELETE_RATIO = 0.35;
/** سحب سريع (px/ms) يحذف حتى قبل بلوغ النسبة، بعد مسافة دنيا. */
const FLING_VELOCITY = 0.6;
const FLING_MIN_PX = 60;
const ANIM_MS = 180;
/** مسافة انزياح التلميح — تكفي لكشف الأيقونة وكلمة «حذف». */
const PEEK_PX = 96;
const PEEK_DELAY_MS = 700;
const PEEK_HOLD_MS = 650;
const PEEK_ANIM_MS = 350;
/** مدة الضغط المطوّل قبل بدء التحديد. */
const LONG_PRESS_MS = 500;

/**
 * يبتلع النقرة التي تلي إفلات الضغط المطوّل أينما وقعت: دخول وضع التحديد قد
 * يُزيح القائمة، فتقع تلك النقرة على صفّ آخر (لا يخصّه suppressClick). يزول
 * المستمع مع أول لمسة جديدة، فلا تُبتلع لمسة حقيقية إن لم تأتِ تلك النقرة.
 */
function swallowNextClick() {
  const swallow = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    cleanup();
  };
  const cleanup = () => {
    document.removeEventListener("click", swallow, true);
    document.removeEventListener("pointerdown", cleanup, true);
  };
  document.addEventListener("click", swallow, true);
  document.addEventListener("pointerdown", cleanup, true);
}

/**
 * صفّ في قائمة الموبايل يُحذف بسحبه نحو اليمين: تنكشف خلفه خلفية حمراء بأيقونة
 * الحذف، وعند الإفلات بعد العتبة (أو بسحبة سريعة) ينزلق خارج الشاشة ثم يُستدعى
 * onDelete؛ وإلا يعود إلى مكانه. الاتجاه فيزيائي (يمين الشاشة) لا منطقي، لأنه
 * إيماءة لا تخطيط.
 *
 * `touch-action: pan-y` يترك التمرير العمودي للمتصفح ويعطي الحركة الأفقية لنا؛
 * فإن بدأ المستخدم تمريرًا عموديًا يُلغي المتصفح المؤشّر (pointercancel).
 * بعد السحب تُلغى النقرة التالية حتى لا يُفتح النشيد. لقارئ الشاشة ولوحة
 * المفاتيح زرّ حذف مخفيّ بصريًا يظهر عند التركيز.
 */
export function SwipeToDelete({
  title,
  onDelete,
  peek = false,
  onLongPress,
  disabled = false,
  className = "",
  children,
}: SwipeToDeleteProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const gesture = useRef<{
    id: number;
    startX: number;
    startY: number;
    lastX: number;
    lastT: number;
    velocity: number;
    mode: "pending" | "swipe" | "ignore";
  } | null>(null);
  const suppressClick = useRef(false);
  const armed = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLongPressRef = useRef(onLongPress);
  onLongPressRef.current = onLongPress;

  // الضغطة الحالية أطلقت التحديد (بالمؤقّت أو بقائمة السياق)، أو تحرّكت فلم تعد ضغطًا مطوّلًا.
  const pressRef = useRef<{ fired: boolean; moved: boolean } | null>(null);

  function fireLongPress() {
    const press = pressRef.current;
    if (!press || press.fired || press.moved || !onLongPressRef.current) return;
    press.fired = true;
    clearLongPress();
    // الإيماءة انتهت هنا: لا سحب بعدها، ولا تفتح النشيدَ النقرةُ التي تلي الإفلات.
    if (gesture.current) gesture.current.mode = "ignore";
    suppressClick.current = true;
    swallowNextClick();
    navigator.vibrate?.(15);
    onLongPressRef.current();
  }

  function clearLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  }

  useEffect(() => clearLongPress, []);

  const width = () => rowRef.current?.offsetWidth ?? 360;

  // التلميح مرة واحدة لكل ظهور للصف، ويُتخطّى مع «تقليل الحركة» أو إن بدأ المستخدم بالسحب.
  useEffect(() => {
    if (!peek || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let active = false;
    const timers = [
      setTimeout(() => {
        if (gesture.current) return;
        active = true;
        setPeeking(true);
        setDx(PEEK_PX);
      }, PEEK_DELAY_MS),
      setTimeout(() => {
        if (active && !gesture.current) setDx(0);
      }, PEEK_DELAY_MS + PEEK_ANIM_MS + PEEK_HOLD_MS),
      setTimeout(() => {
        active = false;
        setPeeking(false);
      }, PEEK_DELAY_MS + 2 * PEEK_ANIM_MS + PEEK_HOLD_MS),
    ];
    return () => {
      timers.forEach(clearTimeout);
      // أُلغي التلميح وهو جارٍ («فهمت» مثلًا): يعود الصف إلى مكانه.
      if (active && !gesture.current) {
        setPeeking(false);
        setDx(0);
      }
    };
  }, [peek]);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (disabled) {
      // قد لا تتبع الضغطَ المطوّل نقرةٌ (أندرويد بعد قائمة السياق): لا تُبتلع لمسة التحديد التالية.
      suppressClick.current = false;
      return;
    }
    if (animating || (e.pointerType === "mouse" && e.button !== 0)) return;
    if (peeking) {
      // لمسة أثناء التلميح: يعود الصف فورًا ويبدأ السحب الحقيقي من الصفر.
      setPeeking(false);
      setDx(0);
    }
    gesture.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastT: e.timeStamp,
      velocity: 0,
      mode: "pending",
    };
    suppressClick.current = false;
    armed.current = false;
    clearLongPress();
    pressRef.current = { fired: false, moved: false };
    if (onLongPressRef.current) {
      longPressTimer.current = setTimeout(() => {
        longPressTimer.current = null;
        fireLongPress();
      }, LONG_PRESS_MS);
    }
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId || g.mode === "ignore") return;
    const moveX = e.clientX - g.startX;
    const moveY = e.clientY - g.startY;
    if (g.mode === "pending") {
      if (Math.abs(moveX) < SLOP_PX && Math.abs(moveY) < SLOP_PX) return;
      // تحرّك الإصبع: سحب أو تمرير، لا ضغط مطوّل.
      clearLongPress();
      if (pressRef.current) pressRef.current.moved = true;
      // أفقي نحو اليمين فقط؛ غير ذلك (عمودي أو نحو اليسار) ليس لنا.
      if (moveX > 0 && Math.abs(moveX) > Math.abs(moveY) * 1.2) {
        g.mode = "swipe";
        suppressClick.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      } else {
        g.mode = "ignore";
        return;
      }
    }
    const dt = e.timeStamp - g.lastT;
    if (dt > 0) g.velocity = (e.clientX - g.lastX) / dt;
    g.lastX = e.clientX;
    g.lastT = e.timeStamp;
    const next = Math.max(0, moveX);
    setDx(next);
    // اهتزاز خفيف مرة واحدة حين يتجاوز السحب عتبة الحذف (أندرويد).
    const past = next > width() * DELETE_RATIO;
    if (past && !armed.current) navigator.vibrate?.(10);
    armed.current = past;
  }

  function finish(e: PointerEvent<HTMLDivElement>, cancelled: boolean) {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    clearLongPress();
    gesture.current = null;
    if (g.mode !== "swipe") return;
    const w = width();
    const shouldDelete =
      !cancelled && (dx > w * DELETE_RATIO || (dx > FLING_MIN_PX && g.velocity > FLING_VELOCITY));
    setAnimating(true);
    if (shouldDelete) {
      setDx(w);
      setTimeout(() => onDelete(false), ANIM_MS);
    } else {
      setDx(0);
      setTimeout(() => setAnimating(false), ANIM_MS);
    }
  }

  const progress = Math.min(1, dx / (width() * DELETE_RATIO));

  return (
    <div ref={rowRef} className={`relative overflow-hidden ${className}`}>
      {/* الخلفية المنكشفة على يسار الصف (السحب نحو اليمين يكشف يساره). */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 flex items-center pl-6 text-white transition-colors ${
          progress >= 1 ? "bg-red-600" : "bg-red-400"
        }`}
        style={{ direction: "ltr" }}
      >
        <span
          className="inline-flex items-center gap-2 text-sm font-semibold"
          style={{ opacity: Math.max(0.35, progress), transform: `scale(${0.85 + 0.15 * progress})` }}
        >
          <Trash2 className="h-5 w-5" />
          حذف
        </span>
      </div>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => finish(e, false)}
        onPointerCancel={(e) => finish(e, true)}
        onClickCapture={(e) => {
          if (!suppressClick.current) return;
          suppressClick.current = false;
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragStart={(e) => e.preventDefault()}
        // الضغط المطوّل يفتح قائمة السياق (أندرويد) أو معاينة الرابط (iOS): التحديد بدلًا منها.
        // وقد يسبق قائمةُ السياق المؤقّتَ (ويلغي المتصفح المؤشّر معها)، فتُطلق التحديد هي أيضًا.
        onContextMenu={
          onLongPress && !disabled
            ? (e) => {
                e.preventDefault();
                if (!pressRef.current) pressRef.current = { fired: false, moved: false };
                fireLongPress();
              }
            : undefined
        }
        className={`relative bg-white ${onLongPress ? "select-none" : ""}`}
        style={{
          touchAction: "pan-y",
          WebkitTouchCallout: onLongPress ? "none" : undefined,
          transform: dx ? `translateX(${dx}px)` : undefined,
          transition: animating
            ? `transform ${ANIM_MS}ms ease-out`
            : peeking
              ? `transform ${PEEK_ANIM_MS}ms ease-in-out`
              : undefined,
        }}
      >
        {children}
        {!disabled && (
        <button
          type="button"
          onClick={(e) => onDelete(e.detail === 0)}
          className="sr-only focus:not-sr-only focus:absolute focus:inset-y-2 focus:start-2 focus:z-10 focus:rounded-lg focus:bg-red-600 focus:px-3 focus:text-sm focus:font-semibold focus:text-white"
        >
          حذف «{title}»
        </button>
        )}
      </div>
    </div>
  );
}
