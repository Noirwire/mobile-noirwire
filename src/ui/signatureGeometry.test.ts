import { layout } from "./theme";
import { arcPath, ARC_REACH, CLOSING_DEGREES, signatureArc } from "./signatureGeometry";

function endpoints(d: string) {
  const numbers = d.match(/-?[\d.]+(e-?\d+)?/g)!.map(Number);
  return { start: { x: numbers[0], y: numbers[1] }, end: { x: numbers[7], y: numbers[8] } };
}

describe("signatureArc", () => {
  it("draws nothing for a box that has not been measured or is too small", () => {
    expect(signatureArc(0, 140)).toBeNull();
    expect(signatureArc(390, 0)).toBeNull();
    expect(signatureArc(Number.NaN, 140)).toBeNull();
    expect(signatureArc(ARC_REACH, 140)).toBeNull();
    expect(signatureArc(390, 4)).toBeNull();
  });

  it.each([
    [320, 150],
    [390, 150],
    [430, 150],
    [390, 320],
    [390, 40],
  ])("stays inside the zone the text never enters, in a %p by %p box", (width, height) => {
    const arc = signatureArc(width, height)!;
    expect(arc.leftmost).toBeGreaterThanOrEqual(width - ARC_REACH - 1e-9);
    expect(arc.leftmost).toBeGreaterThan(width - layout.signature);

    const { start, end } = endpoints(arc.d);
    for (const { x, y } of [start, end]) {
      expect(x).toBeCloseTo(width);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(height);
    }
    expect(start.y).toBeGreaterThan(end.y);
  });

  it("is a segment, not a ring, and closes at most its last twenty degrees", () => {
    const arc = signatureArc(390, 150)!;
    const radius = arc.closingLength / ((CLOSING_DEGREES * Math.PI) / 180);
    expect(arc.length).toBeLessThan(Math.PI * radius);
    expect(arc.closingLength).toBeLessThan(arc.length);
    expect(Number.isFinite(arc.length)).toBe(true);
  });
});

describe("arcPath", () => {
  it("uses the small arc for a short span and the large arc past half a turn", () => {
    expect(arcPath(0, 0, 10, 0, 90)).toContain(" 0 0 1 ");
    expect(arcPath(0, 0, 10, 0, 270)).toContain(" 0 1 1 ");
  });
});
