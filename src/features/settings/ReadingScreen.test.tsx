import { render, screen } from "@testing-library/react-native";
import { CostsScreen, RisksScreen } from "./ReadingScreen";

let mockFeeBps = 50;
jest.mock("@noirwire/shared/infrastructure", () => ({
  ...jest.requireActual("@noirwire/shared/infrastructure"),
  noirwireFeeBps: () => mockFeeBps,
}));

describe("CostsScreen", () => {
  afterEach(() => {
    mockFeeBps = 50;
  });

  it("states the trading fee the app charges and the private move's cost, from the figures the reviews charge by", async () => {
    await render(<CostsScreen />);
    expect(screen.getByText(/tracker: 0\.5% of the trade/)).toBeOnTheScreen();
    expect(screen.getByText(/privately: 0\.1% \+ \$0\.20/)).toBeOnTheScreen();
  });

  it("says NoirWire charges no trading fee when none is configured", async () => {
    mockFeeBps = 0;
    await render(<CostsScreen />);
    expect(screen.getByText(/tracker: no NoirWire fee/)).toBeOnTheScreen();
  });
});

describe("RisksScreen", () => {
  it("is for reading, under headings, with nothing to accept", async () => {
    await render(<RisksScreen />);
    expect(screen.getAllByRole("header").length).toBeGreaterThan(1);
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
