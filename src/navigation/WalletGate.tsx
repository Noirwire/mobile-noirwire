import { useRootNavigationState, usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useRef, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useUnlocked, useWalletExists } from "@/features/wallet/useWallet";
import { colors } from "@/ui/theme";
import { gateRedirect, placeOf } from "./gateRules";

/**
 * Keeps every route to the screens its wallet state allows. While the vault
 * has not answered, or a redirect is on its way, the base colour covers the
 * app, so a locked phone never flashes what is behind Unlock.
 */
export function WalletGate({ children }: { children: ReactNode }) {
  const exists = useWalletExists();
  const unlocked = useUnlocked();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const ready = useRootNavigationState()?.key !== undefined;
  const place = placeOf(segments);
  const resume = useRef<string | null>(null);

  useEffect(() => {
    if (unlocked && place === "app") resume.current = pathname;
    if (exists === false) resume.current = null;
  }, [unlocked, place, pathname, exists]);

  // Whether to leave this screen does not depend on where an unlock resumes; only where to goes.
  const leaving = gateRedirect({ exists, unlocked }, place, null) !== null;
  useEffect(() => {
    const target = gateRedirect({ exists, unlocked }, place, resume.current);
    if (ready && target) router.replace(target);
  }, [ready, exists, unlocked, place, router]);

  return (
    <>
      {children}
      {(exists === undefined || leaving) && <View style={styles.cover} />}
    </>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFill, backgroundColor: colors.base },
});
