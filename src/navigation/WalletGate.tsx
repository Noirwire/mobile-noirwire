import {
  useGlobalSearchParams,
  useRootNavigationState,
  usePathname,
  useRouter,
  useSegments,
} from "expo-router";
import { useEffect, useRef, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useUnlocked, useWalletExists } from "@/features/wallet/useWallet";
import { colors } from "@/ui/theme";
import { resumePath, UNKNOWN_TRACKER_LINK, UNKNOWN_TRACKER_PARAM, visitorLink } from "./deepLinks";
import { gateRedirect, placeOf, resumesAfterUnlock } from "./gateRules";

/**
 * Keeps every route to the screens its wallet state allows. While the vault
 * has not answered, or a redirect is on its way, the base colour covers the
 * app, so a locked phone never flashes what is behind Unlock.
 *
 * A link from outside has already been through the allow-list by the time it
 * is a path here. With no wallet, the two markets links open as a visitor
 * sees them and every other link opens Welcome. With a locked wallet, the
 * link is held, Unlock is shown, and the link is followed once the wallet is
 * unlocked; it is held in memory only, so closing the app drops it.
 */
export function WalletGate({ children }: { children: ReactNode }) {
  const exists = useWalletExists();
  const unlocked = useUnlocked();
  const segments = useSegments();
  const pathname = usePathname();
  const unknownTracker = useGlobalSearchParams()[UNKNOWN_TRACKER_PARAM] === "1";
  const router = useRouter();
  const ready = useRootNavigationState()?.key !== undefined;
  const place = placeOf(segments);
  const resume = useRef<string | null>(null);
  const resumable = resumesAfterUnlock(segments);
  const visitor = visitorLink(pathname, unknownTracker);

  useEffect(() => {
    if (exists && resumable) {
      resume.current =
        pathname === "/markets" && unknownTracker ? UNKNOWN_TRACKER_LINK : resumePath(pathname);
    }
    if (exists === false) resume.current = null;
  }, [exists, resumable, pathname, unknownTracker]);

  // Whether to leave this screen does not depend on where an unlock resumes; only where to goes.
  const leaving = gateRedirect({ exists, unlocked }, place, null) !== null;
  useEffect(() => {
    const target = gateRedirect({ exists, unlocked }, place, resume.current, visitor);
    if (ready && target) router.replace(target);
  }, [ready, exists, unlocked, place, visitor, router]);

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
