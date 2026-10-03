import type { VaultRepository } from "@noirwire/shared/platform";

/**
 * Settings that live outside the encrypted wallet record, each under its own
 * vault key. None of them says anything about the wallet itself: whether
 * analytics may be sent, and whether biometric unlock is on.
 */
const ANALYTICS_KEY = "noirwire.mobile.analytics";
const BIOMETRIC_KEY = "noirwire.mobile.biometric";

export type BiometricSetting = "off" | "on" | "changed";

type State = { analytics: boolean; biometric: BiometricSetting };

export type Preferences = {
  /** Reads what is stored. Until it has, analytics reads as off and biometric unlock as off. */
  load(): Promise<void>;
  analyticsEnabled(): boolean;
  setAnalyticsEnabled(enabled: boolean): Promise<boolean>;
  biometric(): BiometricSetting;
  setBiometric(setting: BiometricSetting): Promise<boolean>;
  /** Everything a reset erases: every preference except the analytics choice. */
  clearForReset(): Promise<boolean>;
  subscribe(listener: () => void): () => void;
};

function parseBiometric(value: string | null): BiometricSetting {
  return value === "on" || value === "changed" ? value : "off";
}

export function vaultPreferences(vault: VaultRepository): Preferences {
  let state: State = { analytics: false, biometric: "off" };
  const listeners = new Set<() => void>();
  const set = (next: Partial<State>) => {
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
  };
  /** True once `value` is what is stored, whether this wrote it or it already was. */
  const write = async (key: string, value: string | null) => {
    const outcome = await vault.update(key, (current) =>
      current === value ? { keep: true } : { write: value },
    );
    return outcome.persisted || outcome.reason === "kept";
  };

  return {
    async load() {
      const [analytics, biometric] = await Promise.all([
        vault.read(ANALYTICS_KEY),
        vault.read(BIOMETRIC_KEY),
      ]);
      set({
        analytics: analytics.ok && analytics.value !== "off",
        biometric: biometric.ok ? parseBiometric(biometric.value) : "off",
      });
    },
    analyticsEnabled: () => state.analytics,
    async setAnalyticsEnabled(enabled) {
      set({ analytics: enabled });
      return write(ANALYTICS_KEY, enabled ? null : "off");
    },
    biometric: () => state.biometric,
    async setBiometric(setting) {
      set({ biometric: setting });
      return write(BIOMETRIC_KEY, setting === "off" ? null : setting);
    },
    async clearForReset() {
      set({ biometric: "off" });
      return write(BIOMETRIC_KEY, null);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
