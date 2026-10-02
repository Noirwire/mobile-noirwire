import { clampWhole, parseTyped } from "./stepperValue";

const PERCENT = { min: 0, max: 100 };

describe("clampWhole", () => {
  it.each([
    [42, 42],
    [42.4, 42],
    [42.5, 43],
    [-5, 0],
    [140, 100],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
  ])("keeps %p as %p", (input, expected) => {
    expect(clampWhole(input, PERCENT)).toBe(expected);
  });
});

describe("parseTyped", () => {
  it("reads a typed whole number and keeps it in bounds", () => {
    expect(parseTyped(" 35 ", 50, PERCENT)).toBe(35);
    expect(parseTyped("250", 50, PERCENT)).toBe(100);
    expect(parseTyped("12,6", 50, PERCENT)).toBe(13);
  });

  it("keeps the current value for empty or unreadable input", () => {
    expect(parseTyped("", 50, PERCENT)).toBe(50);
    expect(parseTyped("abc", 50, PERCENT)).toBe(50);
  });
});
