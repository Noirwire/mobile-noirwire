import { hasLoaded } from "@noirwire/shared/domain";
import { lock } from "@noirwire/shared/wallet";
import { unlockedWallet } from "../portfolio/testWallet";
import { forgetWallet, installTestPlatform } from "../testServices";
import { balanceFreshness } from "./balanceFreshness";

beforeEach(() => installTestPlatform());
afterEach(forgetWallet);

it("counts balances as never read again once the wallet locks", async () => {
  await unlockedWallet();
  expect(hasLoaded(balanceFreshness())).toBe(true);
  lock();
  expect(hasLoaded(balanceFreshness())).toBe(false);
});
