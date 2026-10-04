import { mobileAppCopy } from "@noirwire/shared/copy";
import { useEffect, useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, layout } from "@/ui/theme";
import { failedRuntimeChecks } from "./runtimeChecks";

const runtimeFailureCopy = mobileAppCopy.runtimeFailure;

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
export const PREPARE_FAILURE = runtimeFailureCopy.configFailure;

export function RuntimeGate({ children, prepare }: RuntimeGateProps) {
  const [failures, setFailures] = useState<string[] | null>(null);
  const [prepareError, setPrepareError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let current = true;
    failedRuntimeChecks()
      .then(async (failed) => {
        if (failed.length === 0 && prepare) await prepare();
        return failed;
      })
      .catch((error: unknown) => {
        // Only a development build names the cause on screen: a wrong or
        // missing setting (such as a missing .env) should say so instead of
        // just "App configuration", without leaking detail in production.
        if (__DEV__) {
          const message = error instanceof Error ? error.message : String(error);
          console.error("RuntimeGate: prepare failed", error);
          if (current) setPrepareError(message);
        }
        return [PREPARE_FAILURE];
      })
      .then((failed) => {
        if (current) setFailures(failed);
      });
    return () => {
      current = false;
    };
  }, [prepare]);

  if (failures === null) return <View style={styles.blank} />;
  if (failures.length > 0) return <RuntimeFailure failures={failures} detail={prepareError} />;
  return children;
}

/** Set in system type on purpose: this screen must not depend on anything that loads. */
export function RuntimeFailure({ failures, detail }: { failures: string[]; detail?: string }) {
  return (
    <ScrollView style={styles.blank} contentContainerStyle={styles.failure}>
      <Text accessibilityRole="header" style={styles.title}>
        {runtimeFailureCopy.title}
      </Text>
      <Text style={styles.detail}>{runtimeFailureCopy.detail}</Text>
      {failures.map((name) => (
        <View key={name}>
          <Text style={styles.failed}>{name}</Text>
          {name === PREPARE_FAILURE && detail ? <Text style={styles.detail}>{detail}</Text> : null}
        </View>
      ))}
      <Text style={styles.detail}>{runtimeFailureCopy.closing}</Text>
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
