import { mobileEnv } from "./env";

const settings = (apiUrl: string | undefined, network: string | undefined = "devnet") => ({
  network,
  apiUrl,
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
    const local = { network: "devnet", apiUrl: "http://localhost:4000" };
    expect(mobileEnv({ ...local, development: true }).apiBaseUrl).toBe("http://localhost:4000");
    expect(() => mobileEnv({ ...local, development: false })).toThrow(/https/);
  });
});
