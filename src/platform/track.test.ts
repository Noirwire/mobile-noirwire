import { EVENT_PATH, ON_CHAIN_DELAY_MS, relayTrack, screenPath } from "./track";
import { mobileHttpConfig } from "./httpConfig";

function setup(enabled = true) {
  const fetch = jest.fn(() => Promise.resolve(new Response(null, { status: 204 })));
  const later = jest.fn();
  let on = enabled;
  const track = relayTrack({
    http: mobileHttpConfig("https://app.noirwire.com", "1.0.0"),
    enabled: () => on,
    screen: () => "/settings",
    fetch: fetch as unknown as typeof globalThis.fetch,
    later,
    random: () => 0.5,
  });
  return { track, fetch, later, setEnabled: (value: boolean) => (on = value) };
}

describe("relayTrack", () => {
  it("posts an event from the closed list to the relay with the client header", () => {
    const { track, fetch } = setup();
    track("wallet_locked", { by: "manual" });
    expect(fetch).toHaveBeenCalledWith(`https://app.noirwire.com${EVENT_PATH}`, {
      method: "POST",
      headers: { "X-NoirWire-Client": "mobile/1.0.0", "Content-Type": "application/json" },
      body: JSON.stringify({ path: "/settings", name: "wallet_locked", data: { by: "manual" } }),
    });
  });

  it("sends nothing while analytics is off", () => {
    const { track, fetch, later, setEnabled } = setup(false);
    track("wallet_created");
    expect(fetch).not.toHaveBeenCalled();
    expect(later).not.toHaveBeenCalled();
    setEnabled(true);
    track("wallet_created");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("holds an event that coincides with a transaction for a random delay", () => {
    const { track, fetch, later } = setup();
    track("sent");
    expect(fetch).not.toHaveBeenCalled();
    const [run, ms] = later.mock.calls[0];
    expect(ms).toBe(ON_CHAIN_DELAY_MS.min + 0.5 * (ON_CHAIN_DELAY_MS.max - ON_CHAIN_DELAY_MS.min));
    run();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("drops a held event if analytics was turned off before it is sent", () => {
    const { track, fetch, later, setEnabled } = setup();
    track("sent");
    setEnabled(false);
    later.mock.calls[0][0]();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("never throws when the relay cannot be reached", async () => {
    const { track, fetch } = setup();
    fetch.mockImplementationOnce(() => Promise.reject(new Error("offline")));
    expect(() => track("wallet_created")).not.toThrow();
    await Promise.resolve();
  });
});

describe("screenPath", () => {
  it("reports a screen without a portfolio id or a tracker symbol", () => {
    expect(screenPath("/portfolio/acc_123")).toBe("/portfolios/:id");
    expect(screenPath("/markets/NVDAx")).toBe("/markets/:symbol");
    expect(screenPath("/settings/password")).toBe("/settings");
    expect(screenPath("/markets")).toBe("/markets");
  });

  it("reports onboarding, unlock and home as the root", () => {
    expect(screenPath("/")).toBe("/");
    expect(screenPath("/welcome")).toBe("/");
    expect(screenPath("/unlock")).toBe("/");
  });
});
