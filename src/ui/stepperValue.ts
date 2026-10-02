export type StepperBounds = { min: number; max: number };

/** A whole number within the bounds. Anything that is not a finite number becomes the minimum. */
export function clampWhole(value: number, { min, max }: StepperBounds) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.round(value), min), max);
}

/** What a person typed, read as a whole number within the bounds. Empty or unreadable keeps the current value. */
export function parseTyped(text: string, current: number, bounds: StepperBounds) {
  const trimmed = text.trim();
  if (trimmed === "") return current;
  const typed = Number(trimmed.replace(",", "."));
  return Number.isFinite(typed) ? clampWhole(typed, bounds) : current;
}
