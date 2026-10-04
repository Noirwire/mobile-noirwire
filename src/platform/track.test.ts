import { fakeApi, installTestPlatform, type FakeApi } from "@noirwire/shared/testing";
import { ON_CHAIN_DELAY_MS, apiTrack, screenPath } from "./track";

let api: FakeApi;

function setup(enabled = true, answer: () => unknown = () => new Response(null, { status: 204 })) {
  installTestPlatform();
  api = fakeApi({ "POST /v1/events": answer });
  const later = jest.fn();
  let on = enabled;
  const track = apiTrack({
    enabled: () => on,
    screen: () => "/settings",
    later,
    random: () => 0.5,
  });
  return { track, later, setEnabled: (value: boolean) => (on = value) };
}

/** Lets the session and the request, both asynchronous, run to their end. */
const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => api.restore());

describe("apiTrack", () => {
  it("posts an event from the closed list to the API's events route, with the session", async () => {
    const { track } = setup();
    track("wallet_locked", { by: "manual" });
    await settled();
    const [call] = api.calls;
    expect(api.calls).toHaveLength(1);
    expect(call.url.href).toBe("https://api.noirwire.test/v1/events");
    expect(call.headers).toMatchObject({
      authorization: "Bearer test-token-1",
      "content-type": "application/json",
    });
    expect(Object.keys(call.headers).some((name) => /noirwire-client/i.test(name))).toBe(false);
    expect(call.json).toEqual({ path: "/settings", name: "wallet_locked", data: { by: "manual" } });
  });

  it("sends nothing while analytics is off", async () => {
    const { track, later, setEnabled } = setup(false);
    track("wallet_created");
    await settled();
    expect(api.calls).toHaveLength(0);
    expect(later).not.toHaveBeenCalled();
    setEnabled(true);
    track("wallet_created");
    await settled();
    expect(api.calls).toHaveLength(1);
  });

  it("holds an event that coincides with a transaction for a random delay", async () => {
    const { track, later } = setup();
    track("sent");
    await settled();
    expect(api.calls).toHaveLength(0);
    const [run, ms] = later.mock.calls[0];
    expect(ms).toBe(ON_CHAIN_DELAY_MS.min + 0.5 * (ON_CHAIN_DELAY_MS.max - ON_CHAIN_DELAY_MS.min));
    run();
    await settled();
    expect(api.calls).toHaveLength(1);
  });

  it("drops a held event if analytics was turned off before it is sent", async () => {
    const { track, later, setEnabled } = setup();
    track("sent");
    setEnabled(false);
    later.mock.calls[0][0]();
    await settled();
    expect(api.calls).toHaveLength(0);
  });

  it("never throws when the API cannot be reached", async () => {
    const { track } = setup(true, () => {
      throw new Error("offline");
    });
    expect(() => track("wallet_created")).not.toThrow();
    await settled();
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
