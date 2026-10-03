import type { ImportResolution, SchemeActivity } from "@noirwire/shared/infrastructure";
import { foundText, groupsOfFour, resultView, schemeFor, sourceView } from "./importFindings";

const ADDRESS = "5aqYNsJsmRuasaFMMWAF2s94r1bTuXZC46A6Ro9C82GY";
const portfolio = (index: number) => ({ index, address: ADDRESS, solBalance: 0 });
const activity = (over: Partial<SchemeActivity> = {}): SchemeActivity => ({
  address: ADDRESS,
  balanceSol: 0,
  portfolios: [],
  active: false,
  ...over,
});

describe("what an import found, in words", () => {
  it("names portfolios and token balances, and never the address", () => {
    expect(foundText(activity())).toBe("Nothing found on chain yet");
    expect(foundText(activity({ active: true, portfolios: [portfolio(1), portfolio(2)] }))).toBe(
      "2 portfolios",
    );
    expect(foundText(activity({ active: true }))).toBe("Token balances");
    expect(foundText(activity({ active: true, balanceSol: 1, portfolios: [portfolio(1)] }))).toBe(
      "1 portfolio and token balances",
    );
  });

  it("preselects and marks the one set that was used", () => {
    const resolution: ImportResolution = {
      scheme: "walletDefault",
      app: activity(),
      walletDefault: activity({ active: true }),
    };
    const view = sourceView(resolution);
    expect(view.preselected).toBe("walletDefault");
    const other = view.options.find((option) => option.choice === "walletDefault")!;
    expect(other.captions.map((caption) => caption.text)).toEqual([
      "Such as Phantom or Solflare.",
      "Token balances",
      "This one has been used.",
    ]);
    expect(schemeFor("notSure", resolution)).toBe("walletDefault");
    expect(JSON.stringify(view)).not.toContain(ADDRESS);
  });

  it("opens the addresses most wallets use when the chain cannot decide, and says so", () => {
    const resolution: ImportResolution = {
      scheme: null,
      app: activity(),
      walletDefault: activity(),
    };
    const view = sourceView(resolution);
    expect(view.preselected).toBeNull();
    expect(view.options[2].captions[0].text).toBe(
      "Opens the addresses most other wallets use. You can switch afterwards.",
    );
    expect(schemeFor("notSure", resolution)).toBe("walletDefault");
    expect(schemeFor("app", resolution)).toBe("app");
  });

  it("reunites or simply imports", () => {
    expect(
      resultView(activity({ active: true, portfolios: [portfolio(1), portfolio(2)] })),
    ).toEqual({
      title: "Wallet reunited with its funds.",
      body: "Found 2 portfolios this phrase already had on chain.",
      found: true,
    });
    expect(resultView(activity())).toMatchObject({ title: "Wallet imported.", found: false });
  });

  it("groups an address in fours", () => {
    expect(groupsOfFour("abcdefghij")).toEqual(["abcd", "efgh", "ij"]);
  });
});
