import { Figtree_400Regular } from "@expo-google-fonts/figtree/400Regular";
import { Figtree_500Medium } from "@expo-google-fonts/figtree/500Medium";
import { Figtree_600SemiBold } from "@expo-google-fonts/figtree/600SemiBold";
import type { TextStyle } from "react-native";
import { colors, fonts } from "./theme";

export const fontAssets = { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold };

export type TextVariant = "display" | "h1" | "h2" | "lead" | "body" | "note" | "label" | "faint";

/** Text set on a button or typed into a field. */
export const controlText: TextStyle = { fontSize: 16, lineHeight: 20 };

/**
 * The web's type recipes at phone width: each clamp() resolves to its lower
 * bound, and an em letter spacing becomes points.
 */
export const textStyles: Record<TextVariant, TextStyle> = {
  display: {
    fontFamily: fonts.medium,
    fontSize: 42,
    lineHeight: 46,
    letterSpacing: -1.68,
    color: colors["ink-strong"],
    fontVariant: ["tabular-nums"],
  },
  h1: {
    fontFamily: fonts.medium,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -1.36,
    color: colors.ink,
  },
  h2: {
    fontFamily: fonts.medium,
    fontSize: 24,
    lineHeight: 27,
    letterSpacing: -0.84,
    color: colors.ink,
  },
  lead: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 28, color: colors.dim },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.ink },
  /** Secondary copy someone still has to read, such as a Notice's message. */
  note: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.dim },
  /** A field's or a section's name: essential, so it is dim, not faint. */
  label: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.dim },
  /** Nonessential captions only. Anything a person needs to read is `note` or `body`. */
  faint: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.faint },
};

/**
 * How far Dynamic Type may enlarge each variant. Headings are already large
 * and would push a screen's first action off it; small text gets the most
 * room because it is the text that most needs it.
 */
export const maxFontScale: Record<TextVariant, number> = {
  display: 1.3,
  h1: 1.3,
  h2: 1.4,
  lead: 1.6,
  body: 1.8,
  note: 1.8,
  label: 2,
  faint: 2,
};
