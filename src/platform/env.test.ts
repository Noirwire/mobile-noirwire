import { mobileEnv } from "./env";

describe("mobileEnv", () => {
  it("reads the network and the relay's origin", () => {
    expect(mobileEnv({ network: "mainnet", relayUrl: "https://app.noirwire.com/" })).toEqual({
      env: { network: "mainnet-beta", referralAccount: null, feeBps: 0 },
      relayUrl: "https://app.noirwire.com",
    });
  });

  it("defaults to devnet like the shared settings do", () => {
    expect(
      mobileEnv({ network: undefined, relayUrl: "https://relay.example.com" }).env.network,
    ).toBe("devnet");
  });

  it("refuses an unknown network", () => {
    expect(() => mobileEnv({ network: "testnet", relayUrl: "https://a.example" })).toThrow(
      /network/,
    );
  });

  it("refuses a missing, plain http or path-carrying relay URL", () => {
    expect(() => mobileEnv({ network: "devnet", relayUrl: undefined })).toThrow(/RELAY_URL/);
    expect(() => mobileEnv({ network: "devnet", relayUrl: "http://relay.example.com" })).toThrow(
      /https/,
    );
    expect(() => mobileEnv({ network: "devnet", relayUrl: "https://a.example/api" })).toThrow(
      /path/,
    );
  });

  it("allows plain http to a development machine", () => {
    expect(mobileEnv({ network: "devnet", relayUrl: "http://localhost:3300" }).relayUrl).toBe(
      "http://localhost:3300",
    );
  });
});
