import type { CSSProperties } from "react";

interface BrandLogoProps {
  /** لون النفحة: ذهبي داكن على الخلفيات الفاتحة، وذهبي فاتح على الخضراء. */
  tone?: "onLight" | "onDark";
  className?: string;
  style?: CSSProperties;
}

const WISP_COLOR = { onLight: "#B7791F", onDark: "#E9C46A" } as const;

/** الشعار الكتابي «نفحات» بخط الرقعة، تتصاعد من طرفه نفحة ذهبية. يرث لون الكلمة
 * وحجمها من الأب (color/font-size)، فتتناسب النفحة مع الحجم لأنها مقيسة بـ em. */
export function BrandLogo({ tone = "onLight", className = "", style }: BrandLogoProps) {
  const wisp = WISP_COLOR[tone];
  return (
    <span
      className={`relative inline-block font-ruqaa font-bold leading-none ${className}`}
      style={style}
    >
      نفحات
      <svg
        aria-hidden="true"
        viewBox="0 0 70 110"
        className="pointer-events-none absolute -top-[0.4em] end-[0.1em] h-[0.75em] w-[0.48em]"
      >
        <path d="M40 104 C28 88 52 74 40 58" fill="none" stroke={wisp} strokeWidth="8" strokeLinecap="round" />
        <path d="M40 58 C30 46 46 36 50 26" fill="none" stroke={wisp} strokeWidth="5" strokeLinecap="round" opacity="0.7" />
        <circle cx="56" cy="16" r="4.5" fill={wisp} opacity="0.55" />
        <circle cx="46" cy="6" r="3.5" fill={wisp} opacity="0.4" />
      </svg>
    </span>
  );
}
