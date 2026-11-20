import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

/**
 * ألوان الواجهة مربوطة بمتغيّرات CSS (راجع globals.css) فتنقلب تلقائيًا بين
 * الوضع الفاتح والداكن (`html.dark`) دون كتابة `dark:` على كل عنصر. القيم تُخزَّن
 * كقنوات RGB لتبقى أدوات الشفافية (`bg-ink/5`) صالحة.
 */
const v = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;
const scale = (prefix: string, steps: (string | number)[]) =>
  Object.fromEntries(steps.map((s) => [s, v(`${prefix}-${s}`)]));

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-scheherazade)", "Amiri", "Tahoma", "serif"],
        naskh: ["var(--font-scheherazade)", "Amiri", "serif"],
        ruqaa: ["var(--font-ruqaa)", "var(--font-scheherazade)", "serif"],
      },
      colors: {
        // الأسطح: surface للبطاقات والحقول واللوحات، canvas لخلفية الشاشات، raised لعنصر مرفوع (سحب).
        surface: v("surface"),
        canvas: v("canvas"),
        raised: v("raised"),
        // طبقة التعتيم خلف اللوحات المنبثقة — داكنة في الوضعين.
        scrim: v("scrim"),
        // تدرّج النص: ink الأساسي ← ink-7 الأخفت.
        ink: { DEFAULT: v("ink"), ...scale("ink", [2, 3, 4, 5, 6, 7]) },
        line: { DEFAULT: v("line"), ...scale("line", [2, 3]) },
        fill: { DEFAULT: v("fill"), ...scale("fill", [2, 3]) },
        // ألوان النص الدلالية: أغمق على الفاتح وأفتح على الداكن ليبقى التباين كافيًا.
        // الخلفيات الصلبة (bg-emerald-700، bg-red-600) تبقى ثابتة لأن نصّها أبيض.
        accent: { DEFAULT: v("accent"), strong: v("accent-strong"), deep: v("accent-deep") },
        danger: { DEFAULT: v("danger"), strong: v("danger-strong") },
        warn: { DEFAULT: v("warn"), strong: v("warn-strong"), deep: v("warn-deep") },
        neutral: scale("neutral", [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
        // الدرجات الفاتحة فقط (خلفيات التمييز والحدود) تنقلب؛ البقية ثابتة.
        emerald: { ...colors.emerald, ...scale("emerald", [50, 100, 200]) },
        red: { ...colors.red, ...scale("red", [50, 100]) },
        amber: { ...colors.amber, ...scale("amber", [50, 100, 200]) },
      },
    },
  },
  plugins: [],
};

export default config;
