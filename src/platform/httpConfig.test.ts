import { CLIENT_HEADER, mobileHttpConfig } from "./httpConfig";

describe("mobileHttpConfig", () => {
  it("sends every request to the relay and names the mobile client and its version", () => {
    const config = mobileHttpConfig("https://app.noirwire.com", "1.2.3");
    expect(config.baseUrl).toBe("https://app.noirwire.com");
    expect(config.headers()).toEqual({ "X-NoirWire-Client": "mobile/1.2.3" });
    expect(CLIENT_HEADER).toBe("X-NoirWire-Client");
    expect(config.rpcUrl).toBeUndefined();
  });

  it("hands out a fresh headers object, so a caller's change cannot stick", () => {
    const config = mobileHttpConfig("https://app.noirwire.com", "1.0.0");
    config.headers()[CLIENT_HEADER] = "changed";
    expect(config.headers()[CLIENT_HEADER]).toBe("mobile/1.0.0");
  });
});
