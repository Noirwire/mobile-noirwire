import { fitScale } from "./fitScale";

describe("fitScale", () => {
  it("leaves text that fits alone", () => {
    expect(fitScale(300, 200, 0.6)).toBe(1);
  });

  it("shrinks text that is too wide, down to the minimum", () => {
    expect(fitScale(200, 250, 0.6)).toBeCloseTo(0.8);
    expect(fitScale(100, 1000, 0.6)).toBe(0.6);
  });

  it("does nothing before both widths are measured", () => {
    expect(fitScale(0, 250, 0.6)).toBe(1);
    expect(fitScale(200, 0, 0.6)).toBe(1);
    expect(fitScale(Number.NaN, 250, 0.6)).toBe(1);
  });
});
