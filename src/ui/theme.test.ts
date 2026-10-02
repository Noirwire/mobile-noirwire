import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { colors, radius } from "./theme";

// The web app is a sibling checkout on a developer's machine and absent in CI,
// where this suite skips instead of failing.
const WEB_THEME = join(__dirname, "../../../app-noirwire/src/app/globals.css");
const describeWhenWebRepoPresent = existsSync(WEB_THEME) ? describe : describe.skip;

function webTokens(prefix: string) {
  const theme = /@theme\s*\{([^}]*)\}/.exec(readFileSync(WEB_THEME, "utf8"))?.[1] ?? "";
  const declaration = new RegExp(`--${prefix}-([a-z-]+):\\s*([^;]+);`, "g");
  return Object.fromEntries(
    Array.from(theme.matchAll(declaration), (match) => [match[1], match[2]]),
  );
}

describeWhenWebRepoPresent("theme tokens against the web app", () => {
  it("carries every colour token with the same name and value", () => {
    expect(colors).toEqual(webTokens("color"));
  });

  it("carries the web's radii", () => {
    expect(webTokens("radius")).toEqual({
      panel: `${radius.panel}px`,
      tile: `${radius.tile}px`,
    });
  });
});

describe("theme", () => {
  it("defines every colour as a six-digit hex", () => {
    for (const value of Object.values(colors)) expect(value).toMatch(/^#[0-9a-f]{6}$/);
  });
});
