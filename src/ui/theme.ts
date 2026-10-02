/**
 * NoirWire ivory and charcoal. One dark theme. The names and values mirror the
 * `@theme` block of the web app's globals.css; theme.test.ts fails when the
 * two drift.
 */
export const colors = {
  base: "#0b0b0c",
  surface: "#131315",
  "surface-raised": "#18181b",
  elevated: "#1c1c1f",
  "surface-strong": "#222226",

  ink: "#e8e6e1",
  "ink-strong": "#f5f3ee",
  dim: "#b4b1aa",
  faint: "#8d8b86",

  "line-subtle": "#272a2d",
  line: "#36393c",
  "line-strong": "#515458",

  safe: "#75bc97",
  warning: "#d1ad70",
  danger: "#f18d80",

  "portfolio-neutral": "#e8e6e1",
  "portfolio-sage": "#9abfa9",
  "portfolio-blue": "#9bafd1",
  "portfolio-lilac": "#b7a5c9",
  "portfolio-clay": "#c8a092",
  "portfolio-ochre": "#d2b479",
  "portfolio-teal": "#88bdb9",
  "portfolio-rose": "#c7a6b5",
} as const;

export type ColorToken = keyof typeof colors;

export const radius = {
  panel: 12,
  tile: 8,
  mark: 10,
  sheet: 16,
  pill: 999,
} as const;

/** The web's 4px spacing step, by the multiples the kit uses. */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  10: 40,
} as const;

/** The smallest comfortable touch target on both platforms. */
export const MIN_TARGET = 44;

/** The backdrop behind a sheet: the base colour at 85%. */
export const overlayColor = "rgba(11, 11, 12, 0.85)";

export const fonts = {
  regular: "Figtree_400Regular",
  medium: "Figtree_500Medium",
  semibold: "Figtree_600SemiBold",
} as const;

export const motion = {
  overlayMs: 200,
  sheetMs: 380,
  pressMs: 200,
} as const;
