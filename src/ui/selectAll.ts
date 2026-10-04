import type { TextInput } from "react-native";

/**
 * Selects everything typed in a field, so the next keystroke replaces it.
 * A browser's input selects itself; a native one is told the range.
 */
export function selectAll(input: TextInput | null, length: number) {
  if (!input) return;
  const browserInput = input as unknown as { select?: () => void };
  if (typeof browserInput.select === "function") browserInput.select();
  else if (typeof input.setSelection === "function") input.setSelection(0, length);
}
