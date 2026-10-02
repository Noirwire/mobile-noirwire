import * as Clipboard from "expo-clipboard";

/** How long a copied secret may sit on the clipboard: the web app's figure. */
export const SECRET_CLIPBOARD_MS = 30_000;

let pendingClear: ReturnType<typeof setTimeout> | null = null;

/**
 * Copies a secret and empties the clipboard again after 30 seconds, so a
 * recovery phrase does not linger for clipboard readers until something else
 * is copied. The clear is kept at module level so it still happens after the
 * screen that copied has gone; a second copy restarts the countdown.
 */
export async function copySecret(text: string) {
  await Clipboard.setStringAsync(text);
  if (pendingClear) clearTimeout(pendingClear);
  pendingClear = setTimeout(() => {
    pendingClear = null;
    Clipboard.setStringAsync("").catch(() => undefined);
  }, SECRET_CLIPBOARD_MS);
}
