import { render, screen } from "@testing-library/react-native";
import { TrackerMark } from "./TrackerMark";

describe("TrackerMark", () => {
  it("keeps its letters the tile's size at every text size, so a mark is never clipped", async () => {
    await render(<TrackerMark symbol="TSMx" />);
    const letters = screen.getByText("TSM", { includeHiddenElements: true });
    expect(letters.props.allowFontScaling).toBe(false);
    expect(letters.props.numberOfLines).toBe(1);
  });

  it("draws only the letters the tile holds whole, without the issuer's trailing x", async () => {
    await render(<TrackerMark symbol="GOOGLx" size="sm" />);
    expect(screen.getByText("GOO", { includeHiddenElements: true })).toBeOnTheScreen();
  });
});
