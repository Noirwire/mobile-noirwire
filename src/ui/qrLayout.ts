/** The smallest QR code (version 1) is 21 modules wide; every larger version has smaller modules. */
const SMALLEST_QR_MODULES = 21;
/** The margin scanners need around a code, in modules. */
export const QUIET_ZONE_MODULES = 4;

/**
 * Splits a card of the given size into the code itself and the quiet zone
 * around it. The zone is sized for the smallest code's modules, so whatever
 * version an address needs, the zone is at least four of its modules wide.
 */
export function qrLayout(size: number) {
  const matrix = (size * SMALLEST_QR_MODULES) / (SMALLEST_QR_MODULES + 2 * QUIET_ZONE_MODULES);
  const quietZone = (size - matrix) / 2;
  return { matrix, quietZone };
}
