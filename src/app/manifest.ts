import type { MetadataRoute } from "next";

// تُرفَع ICONS_VERSION كلما تغيّرت الأيقونات: الـ SW يخدمها من الكاش أولًا، وتغيّر
// الرابط يجعل المتصفح يلحظ أن أيقونة التطبيق المثبَّت تغيّرت فيحدّثها.
const ICONS_VERSION = "2";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "نفحات - ديوان الإنشاد",
    short_name: "نفحات",
    description: "منصة لإدارة وحفظ الأناشيد العربية",
    start_url: "/",
    display: "standalone",
    dir: "rtl",
    lang: "ar",
    background_color: "#fafafa",
    theme_color: "#047857",
    orientation: "portrait",
    icons: [
      {
        src: `/icons/icon-192.png?v=${ICONS_VERSION}`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/icons/icon-512.png?v=${ICONS_VERSION}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/icons/icon-maskable-512.png?v=${ICONS_VERSION}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
