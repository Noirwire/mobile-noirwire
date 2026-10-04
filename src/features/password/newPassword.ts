import { walletCopy, mobileWalletCopy } from "@noirwire/shared/copy";
import { assessPassword, suggestPassphrase } from "@noirwire/shared/wallet";
import { useCallback, useEffect, useState } from "react";
import "./strengthChecker";

/** The strength line updates this long after typing stops. */
export const STRENGTH_DELAY_MS = 200;

type Strength =
  { kind: "none" } | { kind: "checking" } | { kind: "weak"; reason: string } | { kind: "strong" };

export type StrengthLine = { text: string; tone: "faint" | "danger" | "safe" } | null;

export function strengthLine(strength: Strength): StrengthLine {
  switch (strength.kind) {
    case "none":
      return null;
    case "checking":
      return { text: walletCopy.newPassword.checking, tone: "faint" };
    case "weak":
      return { text: strength.reason, tone: "danger" };
    case "strong":
      return { text: walletCopy.newPassword.strong, tone: "safe" };
  }
}

export type NewPassword = {
  password: string;
  confirm: string;
  revealed: boolean;
  strength: StrengthLine;
  mismatch: string | null;
  /** Strong and confirmed: the one condition for the submit button. */
  ready: boolean;
  setPassword(value: string): void;
  setConfirm(value: string): void;
  setRevealed(value: boolean): void;
  suggest(): void;
  clear(): void;
};

/**
 * The new-password block of spec 2.8 and 2.30: the strength verdict comes
 * from the shared assessment, 200 ms after typing stops; a suggestion fills
 * both fields and shows them, because a passphrase nobody saw cannot be
 * written down.
 */
export function useNewPassword(): NewPassword {
  const [password, setPasswordValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [verdict, setVerdict] = useState<{ password: string; strength: Strength } | null>(null);

  useEffect(() => {
    if (password === "") return;
    let current = true;
    const settle = (strength: Strength) => current && setVerdict({ password, strength });
    const timer = setTimeout(() => {
      assessPassword(password)
        .then((result) =>
          settle(result.ok ? { kind: "strong" } : { kind: "weak", reason: result.reason }),
        )
        .catch(() => settle({ kind: "weak", reason: mobileWalletCopy.newPassword.checkFailed }));
    }, STRENGTH_DELAY_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [password]);

  const strength: Strength =
    password === ""
      ? { kind: "none" }
      : verdict?.password === password
        ? verdict.strength
        : { kind: "checking" };

  const clear = useCallback(() => {
    setPasswordValue("");
    setConfirm("");
    setRevealed(false);
  }, []);

  const mismatch = confirm !== "" && confirm !== password ? walletCopy.newPassword.mismatch : null;
  return {
    password,
    confirm,
    revealed,
    strength: strengthLine(strength),
    mismatch,
    ready: strength.kind === "strong" && confirm === password,
    setPassword: setPasswordValue,
    setConfirm,
    setRevealed,
    suggest() {
      const passphrase = suggestPassphrase();
      setPasswordValue(passphrase);
      setConfirm(passphrase);
      setRevealed(true);
    },
    clear,
  };
}
