// تنسيق نص الأناشيد المُصيَّر (فقرات، عريض/مائل/تسطير) دون حجم الخط — يُشترك بين
// عرض القراءة الكامل وبطاقات المعاينة المُصغَّرة. font-naskh يعتمد خطّ «شهرزاد الجديد»
// لكل نصوص الأناشيد (أوضح للتشكيل)، بينما تبقى الواجهة على خطّ Tajawal.
export const lyricsProseFormatCls = [
  "font-naskh",
  "[&_p]:mb-4 [&_p:last-child]:mb-0",
  "[&_strong]:font-bold [&_em]:italic [&_u]:underline",
].join(" ");

// عرض القراءة الكامل: حجم الخط مُشتقّ من الحجم الأساسي (text-lg = 1.125rem) مضروبًا
// في متغيّر التكبير `--lyrics-scale` (افتراضيًا 1) الذي يضبطه متحكّم الحجم عالميًا
// (راجع lib/lyrics-font.ts). leading-loose نسبيّ لحجم الخط فيتناسب معه تلقائيًا.
// يُستخدم في صفحة النشيد والقارئ دون اتصال وأجسام القوائم القابلة للطيّ.
export const lyricsProseCls = [
  "text-[length:calc(1.125rem*var(--lyrics-scale,1))] leading-loose",
  lyricsProseFormatCls,
].join(" ");
