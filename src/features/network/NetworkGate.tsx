import { connection, expectedGenesisHash, networkLabel } from "@noirwire/shared/infrastructure";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";
import { Button, Mark, StillWorking, Text, useTopLoader, useWaiting } from "@/ui";
import { colors, layout } from "@/ui/theme";
import { useUnlocked, useWalletExists } from "../wallet/useWallet";
import { checkNetwork, networkGateView, type GateState, type NetworkCheck } from "./gateCheck";

type NetworkGateProps = {
  children: ReactNode;
  /** Which chain the RPC serves; the device asks for its genesis hash through the API. */
  check?: () => Promise<NetworkCheck>;
  /** The network this build is for, in words. */
  network?: () => string;
};

/** NoirWire could not be reached, and the app is open all the same: what to say, and the way to ask again. */
export type Unreachable = { message: string; retry: string; onRetry: () => void };

const UnreachableContext = createContext<Unreachable | null>(null);

/** Null while NoirWire answers, or while it is being asked again. */
export const useUnreachable = () => useContext(UnreachableContext);

/** How often the network is asked again, quietly, while the app is open without an answer. */
export const RECHECK_MS = 15_000;

const deviceCheck = () => checkNetwork(() => connection.getGenesisHash(), expectedGenesisHash());

/**
 * Spec 2.0: nothing that reads the chain opens until the RPC has proved which
 * network it serves. Once it has, the gate stays open for the rest of the
 * run. The check waits by the waiting standard: quiet at first, then what it
 * is doing, then that it is still at it; one that never answers ends as
 * unreachable, with "Try again".
 *
 * Unlocking reads only what the device stores, so a stored, locked wallet is
 * not held back by an unreachable network: the unlock screen shows, with the
 * message as a notice on it, and what opens after it reports its own waiting
 * and failures. The network is asked again every few seconds meanwhile, and
 * the wrong one still closes the app. Every signature is checked against the
 * network again in any case, by the signing guard.
 */
export function NetworkGate({
  children,
  check = deviceCheck,
  network = networkLabel,
}: NetworkGateProps) {
  const exists = useWalletExists();
  const unlocked = useUnlocked();
  const [state, setState] = useState<GateState>("checking");
  const [attempt, setAttempt] = useState(0);
  const [openedForUnlock, setOpenedForUnlock] = useState(false);
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

  // Which words an unreachable network gets depends on what the device stores, so they wait for the vault's answer.
  const shown = state === "unreachable" && exists === undefined ? "checking" : state;
  const view =
    shown === "ok"
      ? null
      : networkGateView(shown, network(), waiting.signal !== "none", {
          hasWallet: exists === true,
          locked: !unlocked,
        });
  if (view?.unlockOffered && !openedForUnlock) setOpenedForUnlock(true);
  const open = state === "ok" || (openedForUnlock && state !== "wrongNetwork");
  const unanswered = open && state === "unreachable";

  useEffect(() => {
    if (!unanswered) return;
    const timer = setInterval(() => setAttempt((count) => count + 1), RECHECK_MS);
    return () => clearInterval(timer);
  }, [unanswered]);

  const message = view?.message ?? null;
  useEffect(() => {
    if (message) AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  const retry = view?.retry ?? null;
  const unreachable = useMemo<Unreachable | null>(
    () =>
      unanswered && message && retry
        ? {
            message,
            retry,
            onRetry: () => {
              setState("checking");
              setAttempt((count) => count + 1);
            },
          }
        : null,
    [unanswered, message, retry],
  );

  if (open) {
    return (
      <UnreachableContext.Provider value={unreachable}>{children}</UnreachableContext.Provider>
    );
  }
  if (!view) return null;

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
