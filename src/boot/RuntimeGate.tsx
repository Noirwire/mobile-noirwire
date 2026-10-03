import { useEffect, useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, layout } from "@/ui/theme";
import { failedRuntimeChecks } from "./runtimeChecks";

/**
 * Renders the app only once the runtime has passed its checks. A wallet on a
 * runtime with broken randomness or encryption would lose money quietly, so a
 * failure stops everything and says what failed.
 */
type RuntimeGateProps = {
  children: ReactNode;
  /** Runs once the checks pass, before anything else renders. A throw stops the app like a failed check. */
  prepare?: () => Promise<unknown>;
};

/** What a failed `prepare` is listed as on the failure screen. */
export const PREPARE_FAILURE = "App configuration";

export function RuntimeGate({ children, prepare }: RuntimeGateProps) {
  const [failures, setFailures] = useState<string[] | null>(null);

  useEffect(() => {
    let current = true;
    failedRuntimeChecks()
      .then(async (failed) => {
        if (failed.length === 0 && prepare) await prepare();
        return failed;
      })
      .catch(() => [PREPARE_FAILURE])
      .then((failed) => {
        if (current) setFailures(failed);
      });
    return () => {
      current = false;
    };
  }, [prepare]);

  if (failures === null) return <View style={styles.blank} />;
  if (failures.length > 0) return <RuntimeFailure failures={failures} />;
  return children;
}

/** Set in system type on purpose: this screen must not depend on anything that loads. */
export function RuntimeFailure({ failures }: { failures: string[] }) {
  return (
    <ScrollView style={styles.blank} contentContainerStyle={styles.failure}>
      <Text accessibilityRole="header" style={styles.title}>
        NoirWire cannot run safely on this device
      </Text>
      <Text style={styles.detail}>
        The app checks its security features every time it starts. These did not work as expected,
        so nothing was opened and no keys were read:
      </Text>
      {failures.map((name) => (
        <Text key={name} style={styles.failed}>
          {name}
        </Text>
      ))}
      <Text style={styles.detail}>
        Update the app and try again. Your wallet is not affected: it can always be restored with
        its recovery phrase.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: colors.base },
  failure: { flexGrow: 1, justifyContent: "center", padding: layout.gutter, gap: layout.group },
  title: { fontSize: 24, fontWeight: "500", color: colors.ink },
  detail: { fontSize: 15, lineHeight: 22, color: colors.dim },
  failed: { fontSize: 15, color: colors.danger },
});
