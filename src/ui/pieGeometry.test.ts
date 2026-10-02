import { ringGeometry, SLICE_GAP, sliceTone, targetTicks, TICK_ROOM } from "./pieGeometry";

const SIZE = 160;
const THICKNESS = 12;

function allFinite(values: number[]) {
  return values.every((value) => Number.isFinite(value));
}

describe("ringGeometry", () => {
  it("normalises weights to the ring and leaves a gap between slices", () => {
    const ring = ringGeometry([50, 30, 20], SIZE, THICKNESS);
    expect(ring.radius).toBe(74);
    expect(ring.circumference).toBeCloseTo(2 * Math.PI * 74);
    const starts = ring.slices.map((slice) => slice.start);
    expect(starts[0]).toBe(0);
    expect(starts[1]).toBeCloseTo(ring.circumference * 0.5);
    expect(starts[2]).toBeCloseTo(ring.circumference * 0.8);
    expect(ring.slices[0].dash).toBeCloseTo(ring.circumference * 0.5 - SLICE_GAP);
  });

  it("draws nothing and produces no NaN when every weight is zero", () => {
    const ring = ringGeometry([0, 0, 0], SIZE, THICKNESS);
    expect(ring.slices.every((slice) => slice.dash === 0)).toBe(true);
    expect(allFinite(ring.slices.flatMap((slice) => [slice.dash, slice.start, slice.tone]))).toBe(
      true,
    );
  });

  it("draws a single slice at 100 percent as the full ring, with no gap", () => {
    const ring = ringGeometry([100], SIZE, THICKNESS);
    expect(ring.slices).toHaveLength(1);
    expect(ring.slices[0].dash).toBeCloseTo(ring.circumference);
    expect(ring.slices[0].start).toBe(0);
  });

  it("closes the ring when one of several slices holds everything", () => {
    const ring = ringGeometry([0, 100, 0], SIZE, THICKNESS);
    expect(ring.slices[1].dash).toBeCloseTo(ring.circumference);
    expect(ring.slices[0].dash).toBe(0);
    expect(ring.slices[2].dash).toBe(0);
  });

  it("treats negative, NaN and infinite weights as nothing", () => {
    const ring = ringGeometry([Number.NaN, -10, 50, Number.POSITIVE_INFINITY], SIZE, THICKNESS);
    expect(ring.slices[2].dash).toBeCloseTo(ring.circumference);
    expect(allFinite(ring.slices.flatMap((slice) => [slice.dash, slice.start]))).toBe(true);
  });

  it("handles an empty mix and a ring too small to draw", () => {
    expect(ringGeometry([], SIZE, THICKNESS).slices).toEqual([]);
    const tiny = ringGeometry([50, 50], 4, THICKNESS);
    expect(tiny.radius).toBe(0);
    expect(allFinite(tiny.slices.map((slice) => slice.dash))).toBe(true);
  });

  it("insets the ring to make room for target ticks", () => {
    expect(ringGeometry([100], SIZE, THICKNESS, TICK_ROOM).radius).toBe(74 - TICK_ROOM);
  });
});

describe("sliceTone", () => {
  it("steps from full ink down to a fifth, and copes with one slice", () => {
    expect(sliceTone(0, 4)).toBe(1);
    expect(sliceTone(3, 4)).toBeCloseTo(0.2);
    expect(sliceTone(0, 1)).toBe(1);
  });
});

describe("targetTicks", () => {
  it("marks where each target slice begins, starting at twelve o'clock", () => {
    const ticks = targetTicks([50, 50], SIZE, THICKNESS);
    expect(ticks).toHaveLength(2);
    expect(ticks[0].x1).toBeCloseTo(SIZE / 2);
    expect(ticks[0].y1).toBeLessThan(SIZE / 2);
    expect(ticks[1].x1).toBeCloseTo(SIZE / 2);
    expect(ticks[1].y1).toBeGreaterThan(SIZE / 2);
  });

  it("draws the ticks outside the ring and inside the box", () => {
    const [tick] = targetTicks([30, 70], SIZE, THICKNESS);
    const ringOuter = 74 - TICK_ROOM + THICKNESS / 2;
    expect(SIZE / 2 - tick.y1).toBeGreaterThan(ringOuter);
    expect(tick.y2).toBeGreaterThanOrEqual(0);
  });

  it("has no ticks for one slice, an empty target or a target of zeros", () => {
    expect(targetTicks([100], SIZE, THICKNESS)).toEqual([]);
    expect(targetTicks([], SIZE, THICKNESS)).toEqual([]);
    expect(targetTicks([0, 0], SIZE, THICKNESS)).toEqual([]);
  });

  it("skips slices with no target", () => {
    expect(targetTicks([50, 0, 50], SIZE, THICKNESS)).toHaveLength(2);
  });
});
