import { allowScreenCaptureAsync, preventScreenCaptureAsync } from "expo-screen-capture";
import { useEffect, useId, useState } from "react";
import { Platform } from "react-native";

/** How long the system gets to answer before the protection counts as refused. */
export const CAPTURE_PROTECTION_LIMIT_MS = 5_000;

export type CaptureProtection = {
  /**
   * The system has confirmed that this content is kept out of screenshots
   * and recordings. Only then may a secret be drawn.
   */
  ready: boolean;
  /** The system refused, or did not answer in time: the secret stays hidden and the screen says so. */
  refused: boolean;
  /** Asks the system again after a refusal. */
  retry: () => void;
};

/**
 * Keeps content out of screenshots and recordings while `wanted`, and fails
 * closed. The secret is not drawn when it is asked for but when the system
 * has answered: protection is requested first, `ready` turns true only once
 * the native call has succeeded, and a call that is rejected or never
 * answers leaves the secret hidden with `refused` set. Reliable on Android;
 * best effort on iOS. A browser has no such protection to ask for, and is
 * ready at once.
 *
 * A sheet is a window of its own, and on Android a new window takes the
 * protection over only at the moment it is created: a sheet that can show a
 * secret waits for `ready` before it opens at all (see Sheet's `secure`).
 */
export function useCaptureProtection(wanted: boolean): CaptureProtection {
  const key = useId();
  const native = Platform.OS !== "web";
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState<{ attempt: number; protected: boolean } | null>(null);

  useEffect(() => {
    if (!wanted || !native) return;
    let current = true;
    let settled = false;
    // The first answer stands: a late success never reveals what was already refused.
    const settle = (kept: boolean) => {
      if (!current || settled) return;
      settled = true;
      clearTimeout(overdue);
      setAnswer({ attempt, protected: kept });
    };
    const overdue = setTimeout(() => settle(false), CAPTURE_PROTECTION_LIMIT_MS);
    preventScreenCaptureAsync(key).then(
      () => settle(true),
      () => settle(false),
    );
    return () => {
      current = false;
      clearTimeout(overdue);
      setAnswer(null);
      allowScreenCaptureAsync(key).catch(() => undefined);
    };
  }, [wanted, native, key, attempt]);

  const settled = wanted && answer?.attempt === attempt ? answer : null;
  return {
    ready: wanted && (!native || settled?.protected === true),
    refused: settled?.protected === false,
    retry: () => setAttempt((count) => count + 1),
  };
}
