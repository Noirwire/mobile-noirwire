/** Longer than any address or payment code the app accepts, so a huge code is refused before it is read. */
export const MAX_SCANNED_LENGTH = 512;

/**
 * What a QR code or the clipboard held, as plain text for the caller to
 * validate, or null when it holds nothing usable. Nothing here decides
 * whether the text is an address: the caller does that, and a scanner never
 * acts on what it reads.
 */
export function readScannedText(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (text === "" || text.length > MAX_SCANNED_LENGTH) return null;
  return text;
}
