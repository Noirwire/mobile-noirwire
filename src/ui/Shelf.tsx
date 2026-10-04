import { Children, useRef, useState, type ReactNode } from "react";
import { ScrollView, View, StyleSheet, type AccessibilityRole, type ViewStyle } from "react-native";
import { layout } from "./theme";

type ShelfProps = {
  children: ReactNode;
  /** Between cards. A shelf of cards uses the wider gap; a chip row passes the tighter one. */
  gap?: number;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  style?: ViewStyle;
  testID?: string;
};

/**
 * A horizontal row of cards or chips that runs to the physical screen edges,
 * cancelling the page's own gutter so nothing is clipped at a hard edge.
 * The gutter comes back as padding at each end of the content, so the first
 * card lines up with the page's text and a sliver of the next one always
 * shows at the trailing edge, the cue to keep scrolling. It snaps to each
 * card's start, once their positions are known, and shows no scrollbar.
 * Every length here is horizontal-only (margin, padding), so it reads the
 * same under a right-to-left layout: nothing is pinned to a physical left or
 * right edge.
 */
export function Shelf({
  children,
  gap = layout.inset,
  accessibilityRole,
  accessibilityLabel,
  style,
  testID,
}: ShelfProps) {
  const positions = useRef<number[]>([]);
  const [snapOffsets, setSnapOffsets] = useState<number[] | undefined>(undefined);
  const total = Children.count(children);

  function measured(index: number, x: number) {
    positions.current[index] = x;
    if (positions.current.filter((value) => value !== undefined).length === total) {
      setSnapOffsets([...positions.current]);
    }
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToOffsets={snapOffsets}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[styles.bleed, style]}
      contentContainerStyle={[styles.content, { gap }]}
    >
      {Children.map(children, (child, index) => (
        <View onLayout={(event) => measured(index, event.nativeEvent.layout.x)}>{child}</View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  /** Cancels the screen's own gutter so the scroll view spans the full width. */
  bleed: { marginHorizontal: -layout.gutter },
  content: { paddingHorizontal: layout.gutter },
});
