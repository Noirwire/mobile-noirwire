import { typedAmount } from "@noirwire/shared/domain";
import { decimalText } from "./decimalText";

describe("decimalText", () => {
  it("reads a comma decimal separator as a period", () => {
    expect(decimalText("12,5")).toBe("12.5");
    expect(typedAmount(decimalText("0,25"))).toBe(0.25);
  });

  it("leaves a period as typed", () => {
    expect(decimalText("12.5")).toBe("12.5");
    expect(decimalText("")).toBe("");
  });

  it("never turns grouped digits into a smaller amount", () => {
    expect(typedAmount(decimalText("1,234,5"))).toBe(0);
    expect(typedAmount(decimalText("1,234.50"))).toBe(0);
  });
});
