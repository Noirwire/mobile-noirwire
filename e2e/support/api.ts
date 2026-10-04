import type { BrowserContext, Route } from "@playwright/test";
import {
  ACCOUNT_SIZE,
  AccountLayout,
  getAssociatedTokenAddressSync,
  MINT_SIZE,
  MintLayout,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { ALL_STOCKS, LEND_RECEIPT_MINT } from "@noirwire/shared/infrastructure";
import { Keypair, PublicKey } from "@solana/web3.js";
import earnTokens from "../fixtures/earn-tokens.json";
import history from "../fixtures/history.json";
import prices from "../fixtures/prices.json";

/** The API origin the export is built against. Every request to it is answered here. */
const API_ORIGIN = "https://api.noirwire.com";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const MAINNET_GENESIS = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
const RENT_EXEMPT_TOKEN_ACCOUNT = 2039280;
/** The relayer's price for a transfer, in raw USDC: 0.012 USDC, under the app's cap. */
const RELAYER_FEE_RAW = 12_000;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-expose-headers": "Age, Retry-After",
};

type Trouble = { kind: "slow"; ms: number } | { kind: "failing" } | { kind: "silent" };

/** The API's own errors, as it writes them: `{ code, error }`, each code with its one status. */
const REFUSALS = {
  invalid_request: [400, "The request is malformed."],
  unauthorized: [401, "A valid session token is required."],
  session_expired: [401, "This session has reached its maximum age. Start a new one."],
  session_invalid: [401, "This session cannot be renewed. Start a new one."],
  not_found: [404, "There is nothing at this path."],
  unavailable: [503, "The service this request needs is not available. Nothing was done."],
} as const;

/** How long a session's token lasts, in seconds: about an hour, as the API issues them. */
const TOKEN_SECONDS = 3600;

/** One request the app made of the API, for a test to read the order of. */
export type ApiRequest = {
  method: string;
  path: string;
  /** The bearer token it carried, or null when it carried none. */
  token: string | null;
};

type RpcCall = { jsonrpc: "2.0"; id: unknown; method: string; params?: unknown[] };
type AccountValue = {
  data: [string, "base64"];
  executable: boolean;
  lamports: number;
  owner: string;
  rentEpoch: number;
  space: number;
};

/** A token account of `owner`'s holding `amount` of a six-decimal `mint`. */
function tokenAccountData(mint: PublicKey, owner: PublicKey, amount: number): Buffer {
  const data = Buffer.alloc(ACCOUNT_SIZE);
  AccountLayout.encode(
    {
      mint,
      owner,
      amount: BigInt(Math.round(amount * 1e6)),
      delegateOption: 0,
      delegate: PublicKey.default,
      state: 1,
      isNativeOption: 0,
      isNative: 0n,
      delegatedAmount: 0n,
      closeAuthorityOption: 0,
      closeAuthority: PublicKey.default,
    },
    data,
  );
  return data;
}

function mintData(decimals: number): Buffer {
  const data = Buffer.alloc(MINT_SIZE);
  MintLayout.encode(
    {
      mintAuthorityOption: 0,
      mintAuthority: PublicKey.default,
      supply: 10n ** 15n,
      decimals,
      isInitialized: true,
      freezeAuthorityOption: 0,
      freezeAuthority: PublicKey.default,
    },
    data,
  );
  return data;
}

function parseBody(text: string | null) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

type Stored = { data: Buffer; program: PublicKey };

function accountValue({ data, program }: Stored): AccountValue {
  return {
    data: [data.toString("base64"), "base64"],
    executable: false,
    lamports: RENT_EXEMPT_TOKEN_ACCOUNT,
    owner: program.toBase58(),
    rentEpoch: 0,
    space: data.length,
  };
}

/**
 * A stand-in for the NoirWire API, answering in the shapes the API
 * documents: anonymous sessions and their renewal, Solana RPC, prices,
 * history, the fee relayer and the Earn vaults, all from committed fixtures.
 * Like the API, it answers every route but the session's own with `401`
 * unless the request carries a token it issued. Any other host is refused
 * and recorded, so a test fails if the app reaches for the internet.
 */
export class FixtureApi {
  // USDC, and every tracker's Token-2022 mint with no multiplier scheduled.
  private readonly accounts = new Map<string, Stored>([
    [USDC_MINT.toBase58(), { data: mintData(6), program: TOKEN_PROGRAM_ID }],
    ...ALL_STOCKS.map(
      (stock) =>
        [
          stock.mint.toBase58(),
          { data: mintData(stock.decimals), program: TOKEN_2022_PROGRAM_ID },
        ] as const,
    ),
  ]);
  private readonly feePayer = Keypair.generate().publicKey.toBase58();
  private readonly paymentWallet = Keypair.generate().publicKey.toBase58();
  private readonly blockhash = Keypair.generate().publicKey.toBase58();

  /** Requests to hosts other than the app and the API, which were refused. */
  readonly outsiders: string[] = [];
  /** API routes the fixtures do not cover, answered `404` as the API answers an unknown path. */
  readonly unanswered: string[] = [];
  /** Every request made of the API, in order. */
  readonly requests: ApiRequest[] = [];
  /** How many sessions were started, how many renewed, and how many requests were told theirs had expired. */
  readonly sessions = { started: 0, renewed: 0, expiredAnswers: 0 };
  /** How each API route misbehaves, by the start of its path. A test sets and clears these. */
  private readonly troubles = new Map<string, Trouble>();
  /** Access tokens issued and still accepted, and what each refresh token renews. */
  private readonly accepted = new Set<string>();
  private readonly renewable = new Set<string>();
  /** Tokens of sessions that have run their time: each is answered `session_expired`. */
  private readonly expired = new Set<string>();
  private issued = 0;
  private reachable = true;

  constructor(private readonly appOrigin: string) {}

  /** From now on, every request to a path starting with `path` waits `ms` before it is answered. */
  slow(path: string, ms: number): void {
    this.troubles.set(path, { kind: "slow", ms });
  }

  /** From now on, every request to a path starting with `path` is answered `503 unavailable`, as the API says a service behind it is down. */
  failing(path: string): void {
    this.troubles.set(path, { kind: "failing" });
  }

  /** From now on, a request to a path starting with `path` is never answered at all. */
  silent(path: string): void {
    this.troubles.set(path, { kind: "silent" });
  }

  /** The API answers `path` as the fixtures say again. */
  healthy(path: string): void {
    this.troubles.delete(path);
  }

  /** From now on nothing reaches the API at all, sessions included: every connection is refused. */
  down(): void {
    this.reachable = false;
  }

  /** The API can be reached again. */
  up(): void {
    this.reachable = true;
  }

  /**
   * Every session issued so far has run its time: a request that carries one
   * is answered `401 session_expired`, and it cannot be renewed. Only a new
   * session is accepted, as on the API.
   */
  expireSessions(): void {
    for (const token of [...this.accepted, ...this.renewable]) this.expired.add(token);
    this.accepted.clear();
    this.renewable.clear();
  }

  /** Gives `owner` a USDC token account holding `usdc`. */
  holdUsdc(owner: string, usdc: number): void {
    this.hold(USDC_MINT, owner, usdc);
  }

  /** Lends `usdc` of `owner`'s through Earn: the vault's receipt token, which the fixture vault redeems one for one. */
  holdEarn(owner: string, usdc: number): void {
    this.hold(LEND_RECEIPT_MINT, owner, usdc);
  }

  private hold(mint: PublicKey, owner: string, amount: number): void {
    const wallet = new PublicKey(owner);
    const account = getAssociatedTokenAddressSync(mint, wallet, true);
    this.accounts.set(account.toBase58(), {
      data: tokenAccountData(mint, wallet, amount),
      program: TOKEN_PROGRAM_ID,
    });
  }

  async install(context: BrowserContext): Promise<void> {
    await context.route(
      (url) => url.origin !== this.appOrigin && url.origin !== API_ORIGIN,
      (route) => {
        this.outsiders.push(route.request().url());
        return route.abort("blockedbyclient");
      },
    );
    await context.route(`${API_ORIGIN}/**`, (route) => this.answer(route));
  }

  private account(key: unknown): AccountValue | null {
    const stored = typeof key === "string" ? this.accounts.get(key) : undefined;
    return stored ? accountValue(stored) : null;
  }

  private rpc(call: RpcCall) {
    const context = { slot: 1 };
    const params = call.params ?? [];
    const result = (() => {
      switch (call.method) {
        case "getGenesisHash":
          return MAINNET_GENESIS;
        case "getAccountInfo":
          return { context, value: this.account(params[0]) };
        case "getMultipleAccounts":
          return { context, value: (params[0] as unknown[]).map((key) => this.account(key)) };
        case "getBalance":
          return { context, value: 0 };
        case "getTokenAccountsByOwner":
          return { context, value: [] };
        case "getSignaturesForAddress":
          return [];
        case "getMinimumBalanceForRentExemption":
          return RENT_EXEMPT_TOKEN_ACCOUNT;
        case "getLatestBlockhash":
          return { context, value: { blockhash: this.blockhash, lastValidBlockHeight: 1000 } };
        case "getSlot":
        case "getBlockHeight":
          return 1;
        case "getSignatureStatuses":
          return { context, value: (params[0] as unknown[]).map(() => null) };
        default:
          return null;
      }
    })();
    return { jsonrpc: "2.0", id: call.id, result };
  }

  private relayer(method: string, body: { method?: string }) {
    if (method === "GET") {
      return {
        available: true,
        feePayers: [this.feePayer],
        paymentWallet: this.paymentWallet,
        accountCreation: true,
      };
    }
    if (body.method === "getPayerSigner") {
      return { result: { signer_address: this.feePayer, payment_address: this.paymentWallet } };
    }
    if (body.method === "estimateTransactionFee") {
      return {
        result: {
          fee_in_token: RELAYER_FEE_RAW,
          signer_pubkey: this.feePayer,
          payment_address: this.paymentWallet,
        },
      };
    }
    return null;
  }

  /** A new pair of tokens, as `POST /v1/session` and its renewal answer: `expiresAt` in seconds. */
  private session() {
    this.issued += 1;
    const accessToken = `e2e-access-${this.issued}`;
    const refreshToken = `e2e-refresh-${this.issued}`;
    this.accepted.add(accessToken);
    this.renewable.add(refreshToken);
    return { accessToken, refreshToken, expiresAt: Math.floor(Date.now() / 1000) + TOKEN_SECONDS };
  }

  /**
   * A price-only Jupiter order at the fixture price, paid for by the venue,
   * with no transaction: enough to review a trade, never enough to sign one.
   */
  private order(request: { inputMint: string; outputMint: string; amount: string }) {
    const usdPer = (mint: string) => {
      if (mint === USDC_MINT.toBase58()) return { usd: 1, decimals: 6 };
      const stock = ALL_STOCKS.find((candidate) => candidate.mint.toBase58() === mint);
      const quoted = stock && (prices.prices as Record<string, { usd: number }>)[stock.symbol];
      return { usd: quoted ? quoted.usd : 1, decimals: stock?.decimals ?? 6 };
    };
    const from = usdPer(request.inputMint);
    const to = usdPer(request.outputMint);
    const inAmount = BigInt(request.amount);
    const dollars = (Number(inAmount) / 10 ** from.decimals) * from.usd;
    const outAmount = BigInt(Math.floor((dollars / to.usd) * 10 ** to.decimals));
    return {
      inputMint: request.inputMint,
      outputMint: request.outputMint,
      inAmount: inAmount.toString(),
      outAmount: outAmount.toString(),
      otherAmountThreshold: ((outAmount * 995n) / 1000n).toString(),
      slippageBps: 50,
      priceImpactPct: "0.0004",
      swapType: "aggregator",
      gasless: true,
      feeBps: 2,
      expireAt: String(Math.floor(Date.now() / 1000) + 300),
      transaction: null,
    };
  }

  private async answer(route: Route) {
    const request = route.request();
    const { pathname, search } = new URL(request.url());
    const method = request.method();
    if (!this.reachable) return route.abort("connectionrefused");
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });

    const token = /^Bearer (.+)$/.exec(request.headers().authorization ?? "")?.[1] ?? null;
    this.requests.push({ method, path: pathname, token });
    const json = (value: unknown, status = 200, headers: Record<string, string> = {}) =>
      route.fulfill({
        status,
        headers: { ...CORS, ...headers },
        contentType: "application/json",
        body: JSON.stringify(value),
      });
    const refuse = (code: keyof typeof REFUSALS) =>
      json({ code, error: REFUSALS[code][1] }, REFUSALS[code][0]);

    const trouble = [...this.troubles].find(([path]) => pathname.startsWith(path))?.[1];
    if (trouble?.kind === "silent") return;
    if (trouble?.kind === "failing") return refuse("unavailable");
    if (trouble?.kind === "slow") await new Promise((resolve) => setTimeout(resolve, trouble.ms));

    // No route takes a query string: the app sends none.
    if (search) return refuse("invalid_request");
    const body = parseBody(request.postData());

    if (pathname === "/v1/session" && method === "POST") {
      this.sessions.started += 1;
      return json(this.session());
    }
    if (pathname === "/v1/session/refresh" && method === "POST") {
      const refreshToken: unknown = body?.refreshToken;
      if (typeof refreshToken !== "string") return refuse("invalid_request");
      if (this.expired.has(refreshToken)) return refuse("session_expired");
      // A refresh token is single use.
      if (!this.renewable.delete(refreshToken)) return refuse("session_invalid");
      this.sessions.renewed += 1;
      return json(this.session());
    }

    if (token !== null && this.expired.has(token)) {
      this.sessions.expiredAnswers += 1;
      return refuse("session_expired");
    }
    if (token === null || !this.accepted.has(token)) return refuse("unauthorized");

    if (pathname === "/v1/rpc" && method === "POST") {
      // One call a request: the API takes no batches.
      return Array.isArray(body) || !body ? refuse("invalid_request") : json(this.rpc(body));
    }
    if (pathname === "/v1/prices" && method === "GET") return json(prices, 200, { Age: "0" });
    if (pathname.startsWith("/v1/history/") && method === "GET") return json(history);
    if (pathname === "/v1/events" && method === "POST") {
      return route.fulfill({ status: 204, headers: CORS });
    }
    if (pathname === "/v1/jupiter/lend/v1/earn/tokens" && method === "GET") return json(earnTokens);
    if (pathname === "/v1/jupiter/lend/v1/earn/earnings" && method === "POST") {
      return json([{ earnings: "0" }]);
    }
    if (pathname === "/v1/jupiter/swap/v2/order" && method === "POST" && body) {
      return json(this.order(body));
    }
    if (pathname === "/v1/relayer") {
      const reply = this.relayer(method, body ?? {});
      if (reply) return json(reply);
    }
    this.unanswered.push(`${method} ${pathname}`);
    return refuse("not_found");
  }
}
