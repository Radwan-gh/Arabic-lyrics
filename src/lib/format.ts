export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ar", {
    year: "numeric",
    month: "long",
    day: "numeric",
    numberingSystem: "latn",
  }).format(date);
}
