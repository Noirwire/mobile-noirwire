import { isAddressFreeParam } from "./routeParams";

describe("isAddressFreeParam", () => {
  it("accepts a portfolio id and a tracker symbol", () => {
    expect(isAddressFreeParam("3f2c9a1e-7b44-4c0e-9d1a-5e6f7a8b9c0d")).toBe(true);
    expect(isAddressFreeParam("SPYx")).toBe(true);
  });

  it("refuses anything shaped like an address", () => {
    expect(isAddressFreeParam("5aqYNsJsmRuasaFMMWAF2s94r1bTuXZC46A6Ro9C82GY")).toBe(false);
    expect(isAddressFreeParam("11111111111111111111111111111111")).toBe(false);
  });

  it("refuses a missing, empty or repeated parameter", () => {
    expect(isAddressFreeParam(undefined)).toBe(false);
    expect(isAddressFreeParam("")).toBe(false);
    expect(isAddressFreeParam(["a", "b"])).toBe(false);
  });
});
