/** The part of the signature drawn in on first reveal; the rest is there from the start. */
export const CLOSING_DEGREES = 20;

/** The furthest the arc reaches in from the trailing edge. It stays inside the zone the text never enters. */
export const ARC_REACH = 28;
/** Kept clear at the top and bottom of the box so the stroke is never clipped. */
const EDGE = 2;

export type SignatureArc = {
  /** One arc of a circle centred off the trailing edge, from the bottom of the box up to the top. */
  d: string;
  /** Its length along the curve. */
  length: number;
  /** The length of its final CLOSING_DEGREES, or all of it if the arc is shorter. */
  closingLength: number;
  /** The arc's leftmost point, the deepest it reaches into the box. */
  leftmost: number;
};

function point(cx: number, cy: number, r: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return { x: cx + r * Math.cos(radians), y: cy + r * Math.sin(radians) };
}

/** A clockwise SVG arc between two angles less than a full turn apart. */
export function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const span = endDeg - startDeg;
  const start = point(cx, cy, r, startDeg);
  const end = point(cx, cy, r, endDeg);
  const largeArc = span > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/**
 * The Home signature: a piece of the raven's enclosing circle, so large that
 * almost all of it sits off the trailing edge. Only a shallow arc shows, from
 * the edge at the bottom of the box, reaching ARC_REACH in, back to the edge
 * at the top. A box with no height, or narrower than the reach, draws nothing.
 */
export function signatureArc(width: number, height: number): SignatureArc | null {
  const halfChord = height / 2 - EDGE;
  if (!(width > ARC_REACH) || !(halfChord > 0)) return null;

  // A short box gets a shallower reach, so the arc never grows past a half circle.
  const reach = Math.min(ARC_REACH, halfChord);
  const r = (halfChord * halfChord + reach * reach) / (2 * reach);
  const halfAngle = (Math.atan2(halfChord, r - reach) * 180) / Math.PI;
  const cx = width - reach + r;
  const cy = height / 2;
  const startDeg = 180 - halfAngle;
  const endDeg = 180 + halfAngle;
  const toRadians = Math.PI / 180;

  return {
    d: arcPath(cx, cy, r, startDeg, endDeg),
    length: r * (endDeg - startDeg) * toRadians,
    closingLength: r * Math.min(CLOSING_DEGREES, endDeg - startDeg) * toRadians,
    leftmost: cx - r,
  };
}
