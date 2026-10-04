import { changeTone, type ChangeTone } from "@noirwire/shared/domain";
import type { ColorToken } from "./theme";

const COLOR: Record<ChangeTone, ColorToken> = { safe: "safe", danger: "danger", neutral: "dim" };

/** The colour of a change: a gain, a loss, or neither. A change of exactly zero is never a loss. */
export function changeColor(value: number): ColorToken {
  return COLOR[changeTone(value)];
}
