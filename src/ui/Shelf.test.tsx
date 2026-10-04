import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";
import { Shelf } from "./Shelf";
import { layout } from "./theme";

function layoutEvent(x: number) {
  return { nativeEvent: { layout: { x, y: 0, width: 100, height: 40 } } };
}

describe("Shelf", () => {
  it("bleeds past the page gutter and restores it as content padding", async () => {
    await render(
      <Shelf testID="shelf">
        <Text>One</Text>
        <Text>Two</Text>
      </Shelf>,
    );
    const scroller = screen.getByTestId("shelf");
    expect(StyleSheet.flatten(scroller.props.style)).toMatchObject({
      marginHorizontal: -layout.gutter,
    });
    expect(StyleSheet.flatten(scroller.props.contentContainerStyle)).toMatchObject({
      paddingHorizontal: layout.gutter,
      gap: layout.inset,
    });
  });

  it("shows no scrollbar and snaps with a quick deceleration", async () => {
    await render(
      <Shelf testID="shelf">
        <Text>One</Text>
      </Shelf>,
    );
    const scroller = screen.getByTestId("shelf");
    expect(scroller.props.showsHorizontalScrollIndicator).toBe(false);
    expect(scroller.props.decelerationRate).toBe("fast");
  });

  it("has nothing to snap to before any card has reported its position", async () => {
    await render(
      <Shelf testID="shelf">
        <Text>One</Text>
      </Shelf>,
    );
    expect(screen.getByTestId("shelf").props.snapToOffsets).toBeUndefined();
  });

  it("snaps to each card's own start once every position is known", async () => {
    await render(
      <Shelf testID="shelf">
        <Text>One</Text>
        <Text>Two</Text>
      </Shelf>,
    );
    await fireEvent(screen.getByText("One").parent!, "layout", layoutEvent(20));
    expect(screen.getByTestId("shelf").props.snapToOffsets).toBeUndefined();
    await fireEvent(screen.getByText("Two").parent!, "layout", layoutEvent(132));
    expect(screen.getByTestId("shelf").props.snapToOffsets).toEqual([20, 132]);
  });

  it("uses the tighter gap a chip row asks for instead of a card shelf's", async () => {
    await render(
      <Shelf testID="shelf" gap={layout.tight}>
        <Text>One</Text>
      </Shelf>,
    );
    expect(
      StyleSheet.flatten(screen.getByTestId("shelf").props.contentContainerStyle),
    ).toMatchObject({
      gap: layout.tight,
    });
  });

  it("renders every card it is given", async () => {
    await render(
      <Shelf testID="shelf">
        <Text>One</Text>
        <Text>Two</Text>
        <Text>Three</Text>
      </Shelf>,
    );
    expect(screen.getByText("One")).toBeOnTheScreen();
    expect(screen.getByText("Two")).toBeOnTheScreen();
    expect(screen.getByText("Three")).toBeOnTheScreen();
  });

  it("passes through the accessibility role and label it is given", async () => {
    await render(
      <Shelf testID="shelf" accessibilityRole="radiogroup" accessibilityLabel="Browse all">
        <Text>One</Text>
      </Shelf>,
    );
    const scroller = screen.getByTestId("shelf");
    expect(scroller.props.accessibilityRole).toBe("radiogroup");
    expect(scroller.props.accessibilityLabel).toBe("Browse all");
  });
});
