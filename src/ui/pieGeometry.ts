/** The space left between two slices, along the ring, in points. */
export const SLICE_GAP = 3;
/** Room kept outside the ring for target ticks, and the gap between the ring and a tick. */
export const TICK_ROOM = 6;
const TICK_CLEARANCE = 2;

export type RingSlice = {
  /** Drawn length along the ring. */
  dash: number;
  /** Where the slice starts, measured along the ring from twelve o'clock. */
  start: number;
  /** Opacity of the slice's ink, a step lighter for each slice after the first. */
  tone: number;
};

export type RingGeometry = {
  centre: number;
  radius: number;
  circumference: number;
  slices: RingSlice[];
};

/** Negative, missing or non-numeric weights count as nothing. */
function weight(part: number) {
  return Number.isFinite(part) && part > 0 ? part : 0;
}

/**
 * A pie drawn in the one ink colour, each slice a step lighter than the one
 * before. The app has no decorative colours to spend on a chart, and a slice
 * is identified by its row anyway; the tone only ties the row to the ring.
 */
export function sliceTone(index: number, count: number) {
  return 1 - (index / Math.max(count - 1, 1)) * 0.8;
}

/**
 * Where each slice of a ring falls. Mirrors the web app's ring: weights are
 * normalised to their total, slices are separated by a small gap only when
 * more than one has a weight, and a ring whose weights add to nothing draws no
 * slices rather than dividing by zero.
 */
export function ringGeometry(
  parts: readonly number[],
  size: number,
  thickness: number,
  inset = 0,
): RingGeometry {
  const centre = size / 2;
  const radius = Math.max((size - thickness) / 2 - inset, 0);
  const circumference = 2 * Math.PI * radius;
  const weights = parts.map(weight);
  const total = weights.reduce((sum, part) => sum + part, 0);
  const gap = weights.filter((part) => part > 0).length > 1 ? SLICE_GAP : 0;

  let start = 0;
  const slices = weights.map((part, index) => {
    const length = total > 0 ? (part / total) * circumference : 0;
    const slice = {
      dash: Math.max(length - gap, 0),
      start,
      tone: sliceTone(index, weights.length),
    };
    start += length;
    return slice;
  });

  return { centre, radius, circumference, slices };
}

export type Tick = { x1: number; y1: number; x2: number; y2: number };

/**
 * Short marks just outside the ring where each target slice begins, so a
 * current mix can be read against its target the way the web's bars carry a
 * target tick. The ring is drawn TICK_ROOM inside the box to make the room.
 * A single slice, or a target that adds to nothing, has no boundaries.
 */
export function targetTicks(target: readonly number[], size: number, thickness: number): Tick[] {
  const weights = target.map(weight);
  const total = weights.reduce((sum, part) => sum + part, 0);
  if (total <= 0 || weights.filter((part) => part > 0).length < 2) return [];

  const { centre, radius } = ringGeometry([], size, thickness, TICK_ROOM);
  const inner = radius + thickness / 2 + TICK_CLEARANCE;
  const outer = centre;

  let covered = 0;
  return weights.flatMap((part) => {
    if (part <= 0) return [];
    const angle = (covered / total) * 2 * Math.PI - Math.PI / 2;
    covered += part;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [
      {
        x1: centre + inner * cos,
        y1: centre + inner * sin,
        x2: centre + outer * cos,
        y2: centre + outer * sin,
      },
    ];
  });
}
