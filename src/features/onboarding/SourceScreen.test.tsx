import type { ImportResolution, SchemeActivity } from "@noirwire/shared/infrastructure";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SourceScreen } from "./SourceScreen";

const ADDRESS = "5aqYNsJsmRuasaFMMWAF2s94r1bTuXZC46A6Ro9C82GY";
const activity = (active: boolean): SchemeActivity => ({
  address: ADDRESS,
  balanceSol: 0,
  portfolios: active ? [{ index: 1, address: ADDRESS, solBalance: 0 }] : [],
  active,
});

describe("SourceScreen", () => {
  it("preselects the one used set and opens it", async () => {
    const onOpen = jest.fn();
    const resolution: ImportResolution = {
      scheme: "app",
      app: activity(true),
      walletDefault: activity(false),
    };
    await render(<SourceScreen resolution={resolution} initialChoice={null} onOpen={onOpen} />);
    expect(screen.getByRole("radio", { name: /^NoirWire/ })).toBeChecked();
    expect(screen.getByText("This one has been used.")).toBeOnTheScreen();
    expect(screen.queryByText(new RegExp(ADDRESS))).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Open this wallet" }));
    expect(onOpen).toHaveBeenCalledWith("app");
  });

  it("waits for a choice when the chain cannot decide", async () => {
    const onOpen = jest.fn();
    const resolution: ImportResolution = {
      scheme: null,
      app: activity(false),
      walletDefault: activity(false),
    };
    await render(<SourceScreen resolution={resolution} initialChoice={null} onOpen={onOpen} />);
    expect(screen.getByRole("button", { name: "Open this wallet" })).toBeDisabled();
    await fireEvent.press(screen.getByRole("radio", { name: /^Not sure/ }));
    await fireEvent.press(screen.getByRole("button", { name: "Open this wallet" }));
    expect(onOpen).toHaveBeenCalledWith("notSure");
  });
});
