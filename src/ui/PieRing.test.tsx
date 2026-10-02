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

  it.each([
    ["the target alone", [50, 50], undefined],
    ["nothing invested", [50, 50], [0, 0]],
    ["an empty portfolio", [], undefined],
    ["one tracker at 100 percent", [100], [100]],
  ])("renders %s", async (name, target, current) => {
    await render(<PieRing target={target} current={current} label={name} />);
    expect(screen.getByRole("image", { name })).toBeOnTheScreen();
  });
});
