import { fireEvent, render, screen } from "@testing-library/react-native";
import { LookAroundScreen } from "./LookAroundScreen";

describe("LookAroundScreen", () => {
  it("offers no trade, balance or watchlist, only the way to a wallet", async () => {
    const onCreate = jest.fn();
    await render(<LookAroundScreen onCreate={onCreate} />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByText(/buy|sell|balance|watchlist/i)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Create a wallet to invest" }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
