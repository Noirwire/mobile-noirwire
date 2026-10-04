import { allowedLink, resumePath, visitorLink } from "./deepLinks";

describe("allowedLink", () => {
  it.each([
    ["noirwire://markets", "/markets"],
    ["noirwire://earn", "/earn"],
    ["noirwire://activity", "/activity"],
    ["noirwire://settings", "/settings"],
    ["/markets", "/markets"],
    ["https://app.noirwire.com/earn", "/earn"],
    ["noirwire:///settings/", "/settings"],
  ])("opens a tab for %s", (link, opens) => {
    expect(allowedLink(link)).toBe(opens);
  });

  it("opens a tracker the catalog has, whatever the capitals", () => {
    const tracker = "/(tabs)/(markets)/markets/NVDAx";
    expect(allowedLink("noirwire://markets/NVDAx")).toBe(tracker);
    expect(allowedLink("noirwire://markets/nvdax")).toBe(tracker);
    expect(allowedLink("https://app.noirwire.com/markets/NVDAX")).toBe(tracker);
  });

  it("opens Markets, saying so, for a tracker the catalog does not have", () => {
    expect(allowedLink("noirwire://markets/NOPEx")).toBe("/markets?unknown=1");
    expect(allowedLink("noirwire://markets/%E0%A4%A")).toBe("/markets?unknown=1");
  });

  it("drops every parameter a link carries", () => {
    expect(allowedLink("noirwire://markets?unknown=1")).toBe("/markets");
    expect(allowedLink("noirwire://markets/NVDAx?side=buy&amount=5&portfolio=p1")).toBe(
      "/(tabs)/(markets)/markets/NVDAx",
    );
    expect(allowedLink("noirwire://settings?reveal=1#phrase")).toBe("/settings");
  });

  it.each([
    "noirwire://receive?reveal=1",
    "noirwire://receive?portfolio=funding&reveal=1",
    "noirwire://fund?portfolio=x&amount=5",
    "noirwire://send",
    "noirwire://send?portfolio=p1&to=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU&amount=100",
    "noirwire://trade?side=buy&symbol=NVDAx&portfolio=p1",
    "noirwire://pie-order?portfolio=p1&mode=invest",
    "noirwire://pie-builder?portfolio=p1",
    "noirwire://new-portfolio",
    "noirwire://portfolio/p1",
    "noirwire://portfolio/p1?view=public",
    "noirwire://settings/recovery-phrase",
    "noirwire://settings/password",
    "noirwire://settings/reset",
    "noirwire://settings/funding-wallet",
    "noirwire://unlock",
    "noirwire://reset",
    "noirwire://welcome",
    "noirwire://import",
    "noirwire://set-password",
    "noirwire://dev/ui",
    "noirwire://markets/NVDAx/extra",
    "noirwire://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081",
    "solana:7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU?amount=1",
    "noirwire://",
    "",
    "not a link at all",
  ])("refuses %s and opens Home", (link) => {
    expect(allowedLink(link)).toBe("/");
  });

  it("never passes an address on, wherever it stands in a link", () => {
    const address = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
    for (const link of [
      `noirwire://markets/${address}`,
      `noirwire://${address}`,
      `noirwire://activity/${address}`,
      `noirwire://markets?address=${address}`,
    ]) {
      expect(allowedLink(link)).not.toContain(address);
    }
  });
});

describe("visitorLink", () => {
  it("honours the two markets links with no wallet stored", () => {
    expect(visitorLink("/markets", false)).toBe("/look-around");
    expect(visitorLink("/markets", true)).toBe("/look-around?unknown=1");
    expect(visitorLink("/markets/NVDAx", false)).toBe("/tracker/NVDAx");
    expect(visitorLink("/markets/NOPEx", false)).toBe("/look-around?unknown=1");
  });

  it("opens Welcome for everything else", () => {
    for (const path of ["/", "/earn", "/activity", "/settings", "/portfolio/p1", "/receive"]) {
      expect(visitorLink(path, false)).toBeNull();
    }
  });
});

describe("resumePath", () => {
  it("names the stack a tracker's screen comes back on, and leaves every other path as it is", () => {
    expect(resumePath("/markets/NVDAx")).toBe("/(tabs)/(markets)/markets/NVDAx");
    for (const path of ["/", "/markets", "/earn", "/settings/about", "/portfolio/p1"]) {
      expect(resumePath(path)).toBe(path);
    }
  });
});
