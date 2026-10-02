/**
 * How much a single line of text has to shrink to fit the width it has: 1 when
 * it already fits or nothing is measured yet, never below `min`.
 */
export function fitScale(available: number, natural: number, min: number) {
  if (!(available > 0) || !(natural > 0)) return 1;
  return Math.min(1, Math.max(min, available / natural));
}
