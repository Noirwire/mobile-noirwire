/**
 * A reset the vault refused still locks the wallet, so the screen that asked
 * for it gives way to Unlock. This carries the one fact Unlock must then
 * say, that the wallet is still stored, across that change of screen.
 */
let refused = false;

export function noteResetRefused() {
  refused = true;
}

/** True once after a refused reset. */
export function takeResetRefused(): boolean {
  const was = refused;
  refused = false;
  return was;
}
