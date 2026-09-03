import { Loader2 } from "lucide-react";

/**
 * مؤشّر انتظار بسيط وموحّد — دائرة دوّارة تدلّ على أنّ إجراءً جارٍ تنفيذه.
 *
 * استخدمه بدل كتابة أيقونة `Loader2` مع `animate-spin` يدوياً في كل موضع، حتى
 * تبقى كل مؤشّرات الانتظار في التطبيق متطابقة الحجم والحركة.
 *
 * - داخل زر: مرّر `label` ليظهر النص بجانب الدائرة (مثال: «جارٍ الحفظ…»).
 * - بدون `label`: تُعلَن للقارئات الشاشية عبر `srLabel` فقط.
 * - يحترم تفضيل «تقليل الحركة» فيتوقّف الدوران تلقائياً.
 */
export function Spinner({
  size = 18,
  label,
  srLabel = "جارٍ التحميل…",
  className = "",
}: {
  /** قطر الدائرة بالبكسل. */
  size?: number;
  /** نص مرئي يظهر بجانب الدائرة (ويُستخدم أيضاً كنصّ إعلان للقارئ الشاشي). */
  label?: string;
  /** نص للقارئ الشاشي فقط حين لا يوجد `label` مرئي. */
  srLabel?: string;
  className?: string;
}) {
  return (
    <span role="status" className={`inline-flex items-center gap-2 ${className}`}>
      <Loader2
        className="animate-spin motion-reduce:animate-none"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
      {label ? <span>{label}</span> : <span className="sr-only">{srLabel}</span>}
    </span>
  );
}
