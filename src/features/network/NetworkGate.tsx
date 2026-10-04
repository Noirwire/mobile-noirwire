import { connection, expectedGenesisHash, networkLabel } from "@noirwire/shared/infrastructure";
import { useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";
import { Button, Mark, StillWorking, Text, useTopLoader, useWaiting } from "@/ui";
import { colors, layout } from "@/ui/theme";
import { checkNetwork, networkGateView, type GateState, type NetworkCheck } from "./gateCheck";

type NetworkGateProps = {
  children: ReactNode;
  /** Which chain the RPC serves; the device asks for its genesis hash through the API. */
  check?: () => Promise<NetworkCheck>;
  /** The network this build is for, in words. */
  network?: () => string;
};

const deviceCheck = () => checkNetwork(() => connection.getGenesisHash(), expectedGenesisHash());

/**
 * Spec 2.0: nothing else opens until the RPC has proved which network it
 * serves. Once it has, the gate stays open for the rest of the run. The check
 * waits by the waiting standard: quiet at first, then what it is doing, then
 * that it is still at it; one that never answers ends as unreachable, with
 * "Try again".
 */
export function NetworkGate({
  children,
  check = deviceCheck,
  network = networkLabel,
}: NetworkGateProps) {
  const [state, setState] = useState<GateState>("checking");
  const [attempt, setAttempt] = useState(0);
  const waiting = useWaiting(state === "checking", "check");
  useTopLoader(state === "checking");

  useEffect(() => {
    let current = true;
    void check().then((result) => current && setState(result));
    return () => {
      current = false;
    };
  }, [check, attempt]);

  // A check that has not answered within its limit is the same as no answer.
  if (state === "checking" && waiting.overdue) setState("unreachable");

  const view = state === "ok" ? null : networkGateView(state, network(), waiting.signal !== "none");
  const message = view?.message ?? null;
  useEffect(() => {
    if (message) AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  if (!view) return <>{children}</>;

  return (
    <View style={styles.gate}>
      <Mark size={40} />
      {view.caption !== null && <Text variant="faint">{view.caption}</Text>}
      <StillWorking waiting={waiting} />
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
