import { mobileEnv } from "./env";

const settings = (apiUrl: string | undefined, network: string | undefined = "devnet") => ({
  network,
  apiUrl,
  referralAccount: undefined,
  feeBps: undefined,
  development: false,
});

describe("mobileEnv", () => {
  it("reads the network and the API's origin", () => {
    expect(mobileEnv(settings("https://api.noirwire.com/", "mainnet"))).toEqual({
      network: "mainnet-beta",
      referralAccount: null,
      feeBps: 0,
      apiBaseUrl: "https://api.noirwire.com",
    });
  });

  it("reads the referral account and fee when both are set", () => {
    const result = mobileEnv({
      ...settings("https://api.noirwire.com"),
      referralAccount: "Fps2W6upBuMTgZpBsjgHbsjVVBthkaMfgaWfTXeKhrZw",
      feeBps: "50",
    });
    expect(result.referralAccount).toBe("Fps2W6upBuMTgZpBsjgHbsjVVBthkaMfgaWfTXeKhrZw");
    expect(result.feeBps).toBe(50);
  });

  it("refuses a referral account with no fee", () => {
    expect(() =>
      mobileEnv({
        ...settings("https://api.noirwire.com"),
        referralAccount: "Fps2W6upBuMTgZpBsjgHbsjVVBthkaMfgaWfTXeKhrZw",
        feeBps: undefined,
      }),
    ).toThrow(/Set both the Jupiter referral account and the NoirWire fee, or neither/);
  });

  it("refuses a fee with no referral account", () => {
    expect(() =>
      mobileEnv({
        ...settings("https://api.noirwire.com"),
        referralAccount: undefined,
        feeBps: "50",
      }),
    ).toThrow(/Set both the Jupiter referral account and the NoirWire fee, or neither/);
  });

  it("names the fee variables in the hint when a fee setting is refused", () => {
    expect(() =>
      mobileEnv({
        ...settings("https://api.noirwire.com"),
        referralAccount: undefined,
        feeBps: "50",
      }),
    ).toThrow(/EXPO_PUBLIC_JUPITER_REFERRAL_ACCOUNT and EXPO_PUBLIC_NOIRWIRE_FEE_BPS/);
  });

  it("refuses an unknown network", () => {
    expect(() => mobileEnv(settings("https://a.example", "testnet"))).toThrow(/network/);
  });

  it("refuses a missing, plain http or path-carrying API URL, and names the variable to fix", () => {
    expect(() => mobileEnv(settings(undefined))).toThrow(/not set.*EXPO_PUBLIC_API_URL/);
    expect(() => mobileEnv(settings("http://api.example.com"))).toThrow(/https/);
    expect(() => mobileEnv(settings("https://a.example/api"))).toThrow(/no path/);
    expect(() => mobileEnv(settings("/api"))).toThrow(/only in a browser/);
  });

  it("allows plain http to a development machine in a development build only", () => {
    const local = {
      network: "devnet",
      apiUrl: "http://localhost:4000",
      referralAccount: undefined,
      feeBps: undefined,
    };
    expect(mobileEnv({ ...local, development: true }).apiBaseUrl).toBe("http://localhost:4000");
    expect(() => mobileEnv({ ...local, development: false })).toThrow(/https/);
  });
});
