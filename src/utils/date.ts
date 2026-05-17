export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayDateKey() {
  return toDateKey(new Date());
}

export function isAfterLocalWeightPromptTime(date = new Date()) {
  return date.getHours() >= 5;
}

export function addDays(dateKey: string, days: number) {
  const date = dateKeyToLocalDate(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function dateKeyToLocalDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getLastNDays(count: number) {
  return Array.from({ length: count }, (_, index) => addDays(getTodayDateKey(), index - count + 1));
}

export function getMonthStartDateKey(date = new Date()) {
  return toDateKey(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function formatDateKey(dateKey: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dateKeyToLocalDate(dateKey));
}

export function formatShortDate(dateKey: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
  }).format(dateKeyToLocalDate(dateKey));
}
