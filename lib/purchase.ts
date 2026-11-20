/** When a stock was bought. Month and year are required; day is optional. */
export interface PurchaseDate {
  year: number;
  month: number; // 1-12
  day?: number;
}

/** Raw form values (strings straight from the inputs). */
export interface DraftDate {
  year: string;
  month: string;
  day: string;
}

export interface DateErrors {
  month?: string;
  day?: string;
  year?: string;
}

export const EMPTY_DRAFT: DraftDate = { year: "", month: "", day: "" };
export const MIN_YEAR = 1900;

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const daysInMonth = (year: number, month: number) => new Date(year || 2000, month, 0).getDate();

export function toDraft(p?: PurchaseDate): DraftDate {
  return p ? { year: String(p.year), month: String(p.month), day: p.day ? String(p.day) : "" } : EMPTY_DRAFT;
}

/** Validates a draft; returns the parsed date when there are no errors. */
export function validateDraft(d: DraftDate, now = new Date()): { value?: PurchaseDate; errors: DateErrors } {
  const errors: DateErrors = {};
  const month = Number(d.month);
  const year = Number(d.year);
  const day = d.day ? Number(d.day) : undefined;
  const thisYear = now.getFullYear();

  if (!d.month) errors.month = "Choose a month";
  if (!d.year.trim()) errors.year = "Enter a year";
  else if (!/^\d{4}$/.test(d.year.trim()) || year < MIN_YEAR) errors.year = `Enter a 4-digit year from ${MIN_YEAR}`;
  else if (year > thisYear) errors.year = "Can’t be in the future";

  if (!errors.month && !errors.year) {
    if (year === thisYear && month > now.getMonth() + 1) errors.month = "Can’t be in the future";
    else if (day !== undefined) {
      if (day > daysInMonth(year, month)) errors.day = `${MONTH_NAMES[month - 1]} ${year} has ${daysInMonth(year, month)} days`;
      else if (new Date(year, month - 1, day) > now) errors.day = "Can’t be in the future";
    }
  }

  const ok = !errors.month && !errors.year && !errors.day;
  return { errors, value: ok ? { year, month, ...(day ? { day } : {}) } : undefined };
}

export function formatPurchase(p?: PurchaseDate): string {
  if (!p) return "—";
  const m = MONTH_NAMES[p.month - 1]?.slice(0, 3) ?? "";
  return p.day ? `${m} ${p.day}, ${p.year}` : `${m} ${p.year}`;
}

export function isPurchaseDate(v: unknown): v is PurchaseDate {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return Number.isInteger(p.year) && Number.isInteger(p.month) && (p.day === undefined || Number.isInteger(p.day));
}
