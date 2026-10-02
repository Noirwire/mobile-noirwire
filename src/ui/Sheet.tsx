import { useCallback, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardAvoidingView, KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, { Easing, FadeIn, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { confirmDiscard } from "./confirmDiscard";
import { SheetHeader } from "./SheetHeader";
import { colors, layout, motion, overlayColor, radius } from "./theme";
import { useSheetSwipe } from "./useSheetSwipe";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** The step's primary action, held above the bottom edge and above the keyboard. */
  footer?: ReactNode;
  /** Given from the second step on: the leading control goes one step back, never out. */
  onBack?: () => void;
  /** Something has been entered: leaving asks "Discard this?" first. */
  dirty?: boolean;
  /** An action is in flight after Confirm: the sheet cannot be dismissed or stepped back. */
  busy?: boolean;
};

const RISE = SlideInDown.duration(motion.sheetMs).easing(Easing.bezier(0.16, 1, 0.3, 1));
const DIM = FadeIn.duration(motion.overlayMs);

/**
 * A sheet that rises from the bottom edge over a dimmed screen. It is pulled
 * down by its header, closed from the scrim, the close control or the system
 * back, and every one of those routes asks first when there is input and does
 * nothing while an action is in flight. Children are mounted only while open,
 * so a reopened sheet starts with fresh state. Both entrance animations are
 * skipped when the system asks for reduced motion.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  onBack,
  dirty = false,
  busy = false,
}: SheetProps) {
  const insets = useSafeAreaInsets();

  const requestClose = useCallback(() => {
    if (busy) return;
    if (dirty) confirmDiscard(onClose);
    else onClose();
  }, [busy, dirty, onClose]);

  const swipe = useSheetSwipe({
    closable: !dirty && !busy,
    locked: busy,
    onDismiss: onClose,
    onDismissRequest: requestClose,
  });

  function systemBack() {
    if (busy) return;
    if (onBack) onBack();
    else requestClose();
  }

  if (!open) return null;

  return (
    <Modal
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      onRequestClose={systemBack}
    >
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View entering={DIM} style={styles.overlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            disabled={busy}
            onPress={requestClose}
            style={StyleSheet.absoluteFill}
          />
          <KeyboardAvoidingView behavior="padding" style={styles.avoider}>
            <Animated.View entering={RISE} style={styles.frame}>
              <Animated.View
                accessibilityViewIsModal
                onAccessibilityEscape={busy ? undefined : requestClose}
                onLayout={(event) => swipe.onLayout(event.nativeEvent.layout.height)}
                style={[styles.sheet, { paddingBottom: insets.bottom + layout.group }, swipe.style]}
              >
                <GestureDetector gesture={swipe.gesture}>
                  <View>
                    <SheetHeader
                      title={title}
                      onBack={busy ? undefined : onBack}
                      onClose={busy ? undefined : requestClose}
                    />
                  </View>
                </GestureDetector>
                <KeyboardAwareScrollView
                  bottomOffset={layout.group}
                  keyboardShouldPersistTaps="handled"
                  style={styles.scroll}
                  contentContainerStyle={styles.content}
                >
                  {children}
                </KeyboardAwareScrollView>
                {footer !== undefined && <View style={styles.footer}>{footer}</View>}
              </Animated.View>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlay: { flex: 1, backgroundColor: overlayColor },
  avoider: { flex: 1, justifyContent: "flex-end", pointerEvents: "box-none" },
  frame: { maxHeight: "92%" },
  sheet: {
    flexShrink: 1,
    paddingHorizontal: layout.gutter,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: colors.surface,
  },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { gap: layout.group, paddingTop: layout.tight, paddingBottom: layout.group },
  footer: { gap: layout.tight, paddingTop: layout.tight },
});
