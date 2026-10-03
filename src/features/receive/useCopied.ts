import { useEffect, useRef, useState } from "react";
import { lightHaptic } from "@/ui/haptics";
import { copySecret } from "@/ui/secretClipboard";

/** How long a Copy control reads "Copied" after a copy. */
export const COPIED_MS = 2_000;

/**
 * Copies an address the user chose to copy, with a light haptic, and answers
 * whether the control should read "Copied" for the next two seconds. The
 * clipboard is emptied again after 30 seconds.
 */
export function useCopied(onCopied?: () => void) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy(text: string) {
    lightHaptic();
    await copySecret(text);
    onCopied?.();
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  }

  return { copied, copy };
}
