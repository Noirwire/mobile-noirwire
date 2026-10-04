import { installTestPlatform, memoryVault, testEnv } from "@noirwire/shared/testing";
import { createWallet, getSnapshot, lock, storeNewWallet } from "@noirwire/shared/wallet";
import { fileNameFor } from "../../src/platform/fileVault";

/** Where the browser build keeps vault files (`src/platform/vaultFiles.web.ts`). */
const WEB_VAULT_PREFIX = "noirwire.vault/";

export const SEED_PASSWORD = "harbor-velvet-orbit-canyon-meadow";
export const PORTFOLIO_NAME = "Investing";
export const FUNDING_USDC = 500;
export const PORTFOLIO_USDC = 457.33;
/** What the portfolio has lent through Earn. */
export const PORTFOLIO_EARN_USDC = 25;

export type SeededWallet = {
  password: string;
  fundingAddress: string;
  portfolio: { id: string; name: string; address: string };
  /** Local storage entries that hold the wallet exactly as the app stores it, locked. */
  storage: Record<string, string>;
};

let seeded: Promise<SeededWallet> | undefined;

/**
 * A stored, locked wallet holding USDC in its funding wallet and in one
 * portfolio, made by the shared wallet code the app itself runs, so the
 * encrypted record is the real one. Made once per worker.
 */
export function seededWallet(): Promise<SeededWallet> {
  seeded ??= seed();
  return seeded;
}

async function seed(): Promise<SeededWallet> {
  const vault = memoryVault();
  installTestPlatform({ vault, env: testEnv({ network: "mainnet-beta" }) });
  const draft = createWallet();
  const wallet = {
    ...draft.wallet,
    funding: {
      ...draft.wallet.funding,
      tokens: { ...draft.wallet.funding.tokens, USDC: FUNDING_USDC },
    },
    portfolios: draft.wallet.portfolios.map((portfolio, index) => ({
      ...portfolio,
      label: index === 0 ? PORTFOLIO_NAME : portfolio.label,
      holdings: portfolio.holdings.map((holding) =>
        holding.symbol === "USDC"
          ? { ...holding, amount: PORTFOLIO_USDC, cost: PORTFOLIO_USDC }
          : holding,
      ),
    })),
  };
  await storeNewWallet(wallet, draft.phrase, SEED_PASSWORD);
  const stored = getSnapshot();
  if (!stored) throw new Error("The seeded wallet was not stored.");
  lock();
  const portfolio = stored.portfolios[0];
  const storage = Object.fromEntries(
    vault.keys().map((key) => [WEB_VAULT_PREFIX + fileNameFor(key), vault.peek(key) ?? ""]),
  );
  return {
    password: SEED_PASSWORD,
    fundingAddress: stored.funding.address,
    portfolio: { id: portfolio.id, name: PORTFOLIO_NAME, address: portfolio.address },
    storage,
  };
}
