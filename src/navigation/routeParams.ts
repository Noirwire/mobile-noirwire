const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Addresses are secrets in this app: a route is logged, restored and shared
 * by the system in ways the app does not control, so a parameter may only be
 * a portfolio id or a tracker symbol. Anything shaped like an address is
 * refused rather than rendered.
 */
export function isAddressFreeParam(value: string | string[] | undefined): value is string {
  return typeof value === "string" && value.length > 0 && !BASE58_ADDRESS.test(value);
}
