import { pendingActionNoteView } from "@noirwire/shared/presentation";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Notice } from "@/ui";
import { layout } from "@/ui/theme";
import type { PendingBlock } from "./usePendingBlock";

/** What a review says about the scope's last action, with the way to clear one only the user can. */
export function PendingNote({ pending }: { pending: PendingBlock }) {
  const [confirming, setConfirming] = useState(false);
  const view = pendingActionNoteView({
    note: pending.note,
    clearable: pending.clear !== null,
    confirming,
  });
  if (!view) return null;
  const { clear } = view;
  return (
    <View style={styles.group}>
      <Notice tone="warning">{view.note}</Notice>
      {clear && !clear.asking && (
        <Button variant="quiet" label={clear.label} onPress={() => setConfirming(true)} />
      )}
      {clear?.asking && (
        <>
          <Notice tone="warning">{clear.warning}</Notice>
          <Button
            variant="danger"
            label={clear.confirm}
            onPress={() => {
              setConfirming(false);
              pending.clear?.();
            }}
          />
          <Button variant="quiet" label={clear.keep} onPress={() => setConfirming(false)} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: layout.tight },
});
