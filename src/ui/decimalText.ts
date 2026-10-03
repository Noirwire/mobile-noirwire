/**
 * What was typed in an amount field, with a comma decimal separator read as
 * a period: a decimal pad in many regions has a comma and no period. Only the
 * first comma is taken, so text with grouping commas stays invalid instead of
 * being read as a smaller number.
 */
export function decimalText(text: string): string {
  return text.includes(".") ? text : text.replace(",", ".");
}
