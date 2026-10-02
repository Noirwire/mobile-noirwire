import { Figtree_400Regular } from "@expo-google-fonts/figtree/400Regular";
import { Figtree_500Medium } from "@expo-google-fonts/figtree/500Medium";
import { Figtree_600SemiBold } from "@expo-google-fonts/figtree/600SemiBold";
import type { TextStyle } from "react-native";
import { colors, fonts } from "./theme";

export const fontAssets = { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold };

export type TextVariant = "h1" | "h2" | "lead" | "body" | "label" | "faint";

/**
 * The web's type recipes at phone width: each clamp() resolves to its lower
 * bound, and an em letter spacing becomes points.
 */
export const textStyles: Record<TextVariant, TextStyle> = {
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
  label: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.faint },
  faint: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.faint },
};

/**
 * How far Dynamic Type may enlarge each variant. Headings are already large
 * and would push a screen's first action off it; small text gets the most
 * room because it is the text that most needs it.
 */
export const maxFontScale: Record<TextVariant, number> = {
  h1: 1.3,
  h2: 1.4,
  lead: 1.6,
  body: 1.8,
  label: 2,
  faint: 2,
};
