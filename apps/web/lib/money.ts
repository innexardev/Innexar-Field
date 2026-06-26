/** Upper bound for money fields: $999,999.99 */
export const MAX_MONEY_CENTS = 99_999_999;

/** Upper bound for quantity fields on estimate lines */
export const MAX_QUANTITY = 99_999;

export function formatCentsAsDollarInput(cents: number): string {
  const clamped = Math.min(Math.max(0, cents), MAX_MONEY_CENTS);
  return (clamped / 100).toFixed(2);
}

/** Allows empty, digits, and up to two decimal places while typing. */
export function isValidDollarDraft(value: string): boolean {
  if (value === "") return true;
  return /^\d*\.?\d{0,2}$/.test(value);
}

export function parseDollarInputToCents(value: string): number {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === ".") return 0;

  const dollars = Number.parseFloat(trimmed);
  if (Number.isNaN(dollars) || dollars < 0) return 0;

  const cents = Math.round(dollars * 100);
  return Math.min(cents, MAX_MONEY_CENTS);
}

/** Allows empty, digits, and up to four decimal places while typing. */
export function isValidQuantityDraft(value: string): boolean {
  if (value === "") return true;
  return /^\d*\.?\d{0,4}$/.test(value);
}

export function parseQuantityInput(value: string): number {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === ".") return 0;

  const quantity = Number.parseFloat(trimmed);
  if (Number.isNaN(quantity) || quantity < 0) return 0;

  return Math.min(quantity, MAX_QUANTITY);
}

export function formatQuantityInput(quantity: number): string {
  const clamped = Math.min(Math.max(0, quantity), MAX_QUANTITY);
  return String(clamped);
}
