import { render, screen } from "@testing-library/react-native";
import { PieRing } from "./PieRing";
import { Text } from "./Text";

describe("PieRing", () => {
  it("is one image with its text alternative", async () => {
    await render(
      <PieRing
        target={[50, 50]}
        current={[46.9, 53.1]}
        label="SP500, target 50 percent, now 46.9 percent, under target"
      >
        <Text>Invested</Text>
      </PieRing>,
    );
    expect(
      screen.getByRole("image", {
        name: "SP500, target 50 percent, now 46.9 percent, under target",
      }),
    ).toBeOnTheScreen();
  });

  it("is still one named image with no mix and nothing invested", async () => {
    await render(<PieRing target={[]} current={[0, 0]} label="An empty portfolio" />);
    expect(screen.getByRole("image", { name: "An empty portfolio" })).toBeOnTheScreen();
  });
});
