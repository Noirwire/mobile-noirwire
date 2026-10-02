import { XIcon } from "phosphor-react-native/src/icons/X";
import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { Easing, FadeIn, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "./IconButton";
import { Text } from "./Text";
import { colors, motion, overlayColor, radius, space } from "./theme";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

const RISE = SlideInDown.duration(motion.sheetMs).easing(Easing.bezier(0.16, 1, 0.3, 1));
const DIM = FadeIn.duration(motion.overlayMs);

/**
 * A sheet that rises from the bottom edge over a dimmed screen. Children are
 * only mounted while open, so a reopened sheet starts with fresh state. Both
 * animations are skipped when the system asks for reduced motion.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  if (!open) return null;

  return (
    <Modal transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={DIM} style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          entering={RISE}
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: insets.bottom + space[6] }]}
        >
          <View style={styles.header}>
            <Text variant="h2" style={styles.title}>
              {title}
            </Text>
            <IconButton label={`Close ${title}`} onPress={onClose}>
              <XIcon size={18} color={colors.faint} />
            </IconButton>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            {children}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: overlayColor },
  sheet: {
    maxHeight: "92%",
    paddingTop: space[6],
    paddingHorizontal: space[6],
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors["line-subtle"],
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: space[6],
    marginBottom: space[4],
  },
  title: { flex: 1 },
  content: { gap: space[4] },
});
