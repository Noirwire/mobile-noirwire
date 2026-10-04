import {
  gateRedirect,
  HOME,
  placeOf,
  resumesAfterUnlock,
  SHEET_ROUTES,
  UNLOCK,
  WELCOME,
} from "./gateRules";

const none = { exists: false, unlocked: false };
const locked = { exists: true, unlocked: false };
const open = { exists: true, unlocked: true };

describe("placeOf", () => {
  it("reads each group of routes", () => {
    expect(placeOf(["(onboarding)", "welcome"])).toBe("onboarding");
    expect(placeOf(["(onboarding)", "set-password"])).toBe("finishing");
    expect(placeOf(["(onboarding)", "biometric"])).toBe("finishing");
    expect(placeOf(["(visitor)", "look-around"])).toBe("visitor");
    expect(placeOf(["unlock"])).toBe("unlock");
    expect(placeOf(["reset"])).toBe("reset");
    expect(placeOf(["(tabs)", "settings", "reset"])).toBe("app");
    expect(placeOf(["(tabs)"])).toBe("app");
  });
});

describe("resumesAfterUnlock", () => {
  it("comes back to a tab or a stack screen", () => {
    expect(resumesAfterUnlock(["(tabs)"])).toBe(true);
    expect(resumesAfterUnlock(["(tabs)", "settings", "about"])).toBe(true);
    expect(resumesAfterUnlock(["(tabs)", "(home)", "portfolio", "[id]"])).toBe(true);
    expect(resumesAfterUnlock(["(tabs)", "(markets)", "markets", "[symbol]"])).toBe(true);
  });

  it("never reopens a sheet: Receive, New portfolio and every money sheet stay closed", () => {
    for (const sheet of SHEET_ROUTES) expect(resumesAfterUnlock([sheet])).toBe(false);
    expect(SHEET_ROUTES).toEqual(expect.arrayContaining(["receive", "new-portfolio"]));
  });

  it("never comes back to a screen outside the unlocked app", () => {
    expect(resumesAfterUnlock(["unlock"])).toBe(false);
    expect(resumesAfterUnlock(["(onboarding)", "welcome"])).toBe(false);
  });
});

describe("gateRedirect", () => {
  it("waits for the vault before deciding anything", () => {
    expect(gateRedirect({ exists: undefined, unlocked: false }, "app", null)).toBeNull();
  });

  it("with no wallet, allows onboarding and visiting and sends everything else to Welcome", () => {
    expect(gateRedirect(none, "onboarding", null)).toBeNull();
    expect(gateRedirect(none, "visitor", null)).toBeNull();
    expect(gateRedirect(none, "app", null)).toBe(WELCOME);
    expect(gateRedirect(none, "unlock", null)).toBe(WELCOME);
  });

  it("with a locked wallet, shows only Unlock and its reset", () => {
    expect(gateRedirect(locked, "unlock", null)).toBeNull();
    expect(gateRedirect(locked, "reset", null)).toBeNull();
    expect(gateRedirect(locked, "app", null)).toBe(UNLOCK);
    expect(gateRedirect(locked, "onboarding", null)).toBe(UNLOCK);
    expect(gateRedirect(locked, "finishing", null)).toBe(UNLOCK);
  });

  it("once unlocked, leaves Unlock for where the wallet was, and onboarding for Home", () => {
    expect(gateRedirect(open, "unlock", "/settings/about")).toBe("/settings/about");
    expect(gateRedirect(open, "unlock", null)).toBe(HOME);
    expect(gateRedirect(open, "onboarding", null)).toBe(HOME);
    expect(gateRedirect(open, "finishing", null)).toBeNull();
    expect(gateRedirect(open, "app", null)).toBeNull();
  });

  it("with no wallet, opens a markets link as a visitor sees it and Welcome for any other", () => {
    expect(gateRedirect(none, "app", null, "/look-around")).toBe("/look-around");
    expect(gateRedirect(none, "app", null, "/tracker/NVDAx")).toBe("/tracker/NVDAx");
    expect(gateRedirect(none, "app", null, null)).toBe(WELCOME);
    expect(gateRedirect(none, "unlock", null, "/look-around")).toBe(WELCOME);
  });

  it("holds a link that arrived while locked, and follows it once unlocked", () => {
    expect(gateRedirect(locked, "app", "/earn")).toBe(UNLOCK);
    expect(gateRedirect(open, "unlock", "/earn")).toBe("/earn");
  });
});
