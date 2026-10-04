import type { ImportResolution, SchemeActivity } from "@noirwire/shared/infrastructure";
import { createWallet, createWalletFromMnemonic, type WalletDraft } from "@noirwire/shared/wallet";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { SaveOrigin } from "../wallet/walletActions";
import { importSchemeFor, type ImportSourceChoice } from "@noirwire/shared/presentation";
import { newQuizAttempt, type PhraseQuiz } from "@noirwire/shared/application";

/**
 * Everything onboarding holds before a password exists, in memory only: the
 * draft wallet and its phrase, the quiz attempt, and what an import found.
 * It lives as long as the onboarding stack, so leaving onboarding leaves
 * nothing behind, and nothing of it ever goes into a route.
 */
type FlowState = {
  origin: SaveOrigin | null;
  draft: WalletDraft | null;
  quiz: PhraseQuiz | null;
  importWords: string[] | null;
  resolution: ImportResolution | null;
  choice: ImportSourceChoice | null;
  /** The password just set, kept only for the biometric offer that follows and dropped with the stack. */
  savedPassword: string | null;
};

const EMPTY: FlowState = {
  origin: null,
  draft: null,
  quiz: null,
  importWords: null,
  resolution: null,
  choice: null,
  savedPassword: null,
};

export type OnboardingFlow = FlowState & {
  startCreate(): void;
  setQuiz(quiz: PhraseQuiz): void;
  startImport(words: string[], resolution: ImportResolution): void;
  /** Opens one set of the imported phrase's addresses as the draft wallet. */
  choose(choice: ImportSourceChoice): void;
  /** A further scan found more for the opened set: the draft is made again with what it found. */
  lookedFurther(activity: SchemeActivity): void;
  /** After the wallet is stored: the phrase and draft are dropped, the password kept for the biometric offer. */
  saved(password: string): void;
};

const FlowContext = createContext<OnboardingFlow | null>(null);

export function OnboardingFlowProvider({
  initial = EMPTY,
  children,
}: {
  initial?: Partial<FlowState>;
  children: ReactNode;
}) {
  const [state, setState] = useState<FlowState>({ ...EMPTY, ...initial });

  const flow = useMemo<OnboardingFlow>(
    () => ({
      ...state,
      startCreate() {
        const draft = createWallet();
        setState({ ...EMPTY, origin: "create", draft, quiz: newQuizAttempt(draft.phrase) });
      },
      setQuiz: (quiz) => setState((current) => ({ ...current, quiz })),
      startImport: (importWords, resolution) =>
        setState({ ...EMPTY, origin: "import", importWords, resolution }),
      choose(choice) {
        setState((current) => {
          if (!current.importWords || !current.resolution) return current;
          const scheme = importSchemeFor(choice, current.resolution);
          const found = current.resolution[scheme];
          const draft = createWalletFromMnemonic(
            current.importWords,
            scheme,
            found.balanceSol,
            found.portfolios,
          );
          return { ...current, choice, draft };
        });
      },
      lookedFurther(activity) {
        setState((current) => {
          if (!current.importWords || !current.resolution || !current.choice) return current;
          const scheme = importSchemeFor(current.choice, current.resolution);
          return {
            ...current,
            resolution: { ...current.resolution, [scheme]: activity },
            draft: createWalletFromMnemonic(
              current.importWords,
              scheme,
              activity.balanceSol,
              activity.portfolios,
            ),
          };
        });
      },
      saved: (savedPassword) => setState({ ...EMPTY, savedPassword }),
    }),
    [state],
  );

  return <FlowContext.Provider value={flow}>{children}</FlowContext.Provider>;
}

export function useOnboardingFlow(): OnboardingFlow {
  const flow = useContext(FlowContext);
  if (!flow) throw new Error("useOnboardingFlow() outside OnboardingFlowProvider.");
  return flow;
}
