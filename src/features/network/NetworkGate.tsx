import { connection, expectedGenesisHash, networkLabel } from "@noirwire/shared/infrastructure";
import { useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";
import { Button, Mark, Text } from "@/ui";
import { colors, layout } from "@/ui/theme";
import {
  checkNetwork,
  networkGateView,
  QUIET_CHECK_MS,
  type GateState,
  type NetworkCheck,
} from "./gateCheck";

type NetworkGateProps = {
  children: ReactNode;
  /** Which chain the RPC serves; the device asks the relay for its genesis hash. */
  check?: () => Promise<NetworkCheck>;
  /** The network this build is for, in words. */
  network?: () => string;
};

const deviceCheck = () => checkNetwork(() => connection.getGenesisHash(), expectedGenesisHash());

/**
 * Spec 2.0: nothing else opens until the RPC has proved which network it
 * serves. Once it has, the gate stays open for the rest of the run.
 */
export function NetworkGate({
  children,
  check = deviceCheck,
  network = networkLabel,
}: NetworkGateProps) {
  const [state, setState] = useState<GateState>("checking");
  const [attempt, setAttempt] = useState(0);
  /** The attempt that has been checking for longer than a moment. */
  const [slowAttempt, setSlowAttempt] = useState<number | null>(null);
  const slow = slowAttempt === attempt;

  useEffect(() => {
    let current = true;
    const timer = setTimeout(() => current && setSlowAttempt(attempt), QUIET_CHECK_MS);
    void check().then((result) => current && setState(result));
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [check, attempt]);

  const view = state === "ok" ? null : networkGateView(state, network(), slow);
  const message = view?.message ?? null;
  useEffect(() => {
    if (message) AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  if (!view) return <>{children}</>;

  return (
    <View style={styles.gate}>
      <Mark size={40} />
      {view.caption !== null && <Text variant="faint">{view.caption}</Text>}
      {view.message !== null && (
        <Text accessibilityRole="alert" style={styles.centered}>
          {view.message}
        </Text>
      )}
      {view.retry !== null && (
        <Button
          label={view.retry}
          variant="quiet"
          onPress={() => {
            setState("checking");
            setAttempt((count) => count + 1);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: layout.group,
    padding: layout.gutter,
    backgroundColor: colors.base,
  },
  centered: { textAlign: "center" },
});
