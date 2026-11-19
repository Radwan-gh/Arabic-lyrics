export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ar", {
    year: "numeric",
    month: "long",
    day: "numeric",
    numberingSystem: "latn",
  }).format(date);
}

/** «٣ أناشيد» بصيغة العدد العربية الصحيحة (مفرد/مثنى/جمع/تمييز مفرد). */
export function formatLyricsCount(n: number): string {
  if (n === 1) return "نشيد واحد";
  if (n === 2) return "نشيدان";
  const num = n.toLocaleString("ar-EG");
  const mod100 = n % 100;
  return mod100 >= 3 && mod100 <= 10 ? `${num} أناشيد` : `${num} نشيدًا`;
}
