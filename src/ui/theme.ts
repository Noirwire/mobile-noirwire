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
  sheet: 20,
  checkbox: 6,
  /** Half a main control's height, so a primary button reads as a pill. */
  button: 26,
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
  8: 32,
  10: 40,
} as const;

/** The rhythm every screen is laid out on. Components use these names, not raw steps. */
export const layout = {
  /** Left and right edge of a screen or a sheet. */
  gutter: space[5],
  /** Between sections of a screen. Space separates sections, not boxes. Also above a hero block. */
  section: space[8],
  /** Below a hero block, such as Home's balance. */
  hero: space[6],
  /** Between the parts of one group, such as a label and its control. */
  group: space[4],
  /** Between tightly related items, such as a title and its caption. */
  tight: space[2],
  /** Inside a control or a cell, between its edge and its content. */
  inset: space[3],
  /** Kept free of text along a balance's trailing edge, for the Home signature. */
  signature: space[10],
  /** The smallest gap, between an icon and the text it sits with. */
  hairline: space[1],
} as const;

/** The smallest comfortable touch target on both platforms. */
export const MIN_TARGET = 44;

export const size = {
  minTarget: MIN_TARGET,
  /** Main buttons and text fields. */
  control: 52,
  /** The numeric field inside a Stepper. */
  stepperField: 56,
  icon: 20,
  iconSmall: 18,
  grabberWidth: 36,
  grabberHeight: 4,
  checkbox: 22,
  checkboxBorder: 1.5,
  checkIcon: 14,
  statusMark: 20,
  stroke: 1,
} as const;

/** The backdrop behind a sheet: the base colour at 85%. */
export const overlayColor = "rgba(11, 11, 12, 0.85)";

/** How much a pressed control dims, and how much a disabled one fades. */
export const opacity = {
  pressed: 0.6,
  inert: 0.4,
} as const;

export const fonts = {
  regular: "Figtree_400Regular",
  medium: "Figtree_500Medium",
  semibold: "Figtree_600SemiBold",
} as const;

export const motion = {
  overlayMs: 200,
  sheetMs: 380,
  pressMs: 200,
  /** A progress step changing state. */
  stepMs: 320,
  /** The Home signature closing its last stretch, on first reveal. */
  signatureMs: 260,
} as const;
