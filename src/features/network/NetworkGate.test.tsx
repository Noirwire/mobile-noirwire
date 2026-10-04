import {
  checkNetwork,
  NETWORK_CHECK_LIMIT_MS,
  type NetworkCheck,
} from "@noirwire/shared/application";
import { STILL_WORKING_AFTER_MS, WAITING_DELAY_MS } from "@noirwire/shared/presentation";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text } from "@/ui";
import {
  STRONG_PASSWORD,
  forgetWallet,
  installTestPlatform,
  renderWith,
  storedLockedWallet,
  testServices,
} from "../testServices";
import { unlockWithPassword } from "../wallet/walletActions";
import { NetworkGate, RECHECK_MS, useUnreachable } from "./NetworkGate";
import { OfflineBanner } from "./OfflineBanner";

const MAINNET = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
const network = () => "Solana mainnet";

const CANNOT_REACH = "Can't reach NoirWire. Check your connection and try again.";

function Inside() {
  const unreachable = useUnreachable();
  return <Text>{unreachable ? `Open, notice: ${unreachable.message}` : "The wallet"}</Text>;
}

describe("NetworkGate", () => {
  beforeEach(() => {
    installTestPlatform();
  });
  afterEach(() => forgetWallet());

  it("opens the app once the network is the expected one", async () => {
    await render(
      <NetworkGate check={async () => "ok"} network={network}>
        <Text>The wallet</Text>
      </NetworkGate>,
    );
    expect(await screen.findByText("The wallet")).toBeOnTheScreen();
  });

  it("refuses to run against another network, with no way past it", async () => {
    await render(
      <NetworkGate check={async () => "wrongNetwork"} network={network}>
        <Text>The wallet</Text>
      </NetworkGate>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(/Solana mainnet/);
    expect(screen.queryByText("The wallet")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("offers to try again when the network cannot be reached, and opens on a pass", async () => {
    const check = jest
      .fn<Promise<"ok" | "unreachable">, []>()
      .mockResolvedValueOnce("unreachable")
      .mockResolvedValueOnce("ok");
    await render(
      <NetworkGate check={check} network={network}>
        <Text>The wallet</Text>
      </NetworkGate>,
    );
    expect(await screen.findByText(CANNOT_REACH)).toBeOnTheScreen();
    expect(screen.queryByText(/balances/)).toBeNull();
    expect(screen.queryByText("The wallet")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("The wallet")).toBeOnTheScreen();
    expect(check).toHaveBeenCalledTimes(2);
  });

  it("lets a stored, locked wallet through to its unlock screen, with the message as a notice", async () => {
    await storedLockedWallet();
    await render(
      <NetworkGate check={async () => "unreachable"} network={network}>
        <Inside />
      </NetworkGate>,
    );
    expect(await screen.findByText(`Open, notice: ${CANNOT_REACH}`)).toBeOnTheScreen();
  });

  it("stays open after the unlock, asks again by itself, and drops the notice on an answer", async () => {
    await storedLockedWallet();
    jest.useFakeTimers();
    try {
      const check = jest
        .fn<Promise<"ok" | "unreachable">, []>()
        .mockResolvedValueOnce("unreachable")
        .mockResolvedValueOnce("ok");
      await render(
        <NetworkGate check={check} network={network}>
          <Inside />
        </NetworkGate>,
      );
      await act(() => jest.advanceTimersByTimeAsync(0));
      expect(screen.getByText(`Open, notice: ${CANNOT_REACH}`)).toBeOnTheScreen();
      await act(async () => {
        await unlockWithPassword(STRONG_PASSWORD);
      });
      expect(screen.getByText(/^Open, notice: We can't show your balances/)).toBeOnTheScreen();
      await act(() => jest.advanceTimersByTimeAsync(RECHECK_MS));
      expect(screen.getByText("The wallet")).toBeOnTheScreen();
      expect(check).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it("closes an app opened for an unlock as soon as the network turns out to be the wrong one", async () => {
    await storedLockedWallet();
    jest.useFakeTimers();
    try {
      const check = jest
        .fn<Promise<"wrongNetwork" | "unreachable">, []>()
        .mockResolvedValueOnce("unreachable")
        .mockResolvedValueOnce("wrongNetwork");
      await render(
        <NetworkGate check={check} network={network}>
          <Inside />
        </NetworkGate>,
      );
      await act(() => jest.advanceTimersByTimeAsync(RECHECK_MS));
      expect(screen.queryByText(/^Open/)).toBeNull();
      expect(screen.getByText(/is not connected to Solana mainnet/)).toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });

  it("stays quiet for a moment, then says it is checking", async () => {
    jest.useFakeTimers();
    try {
      await render(
        <NetworkGate check={() => new Promise(() => undefined)} network={network}>
          <Text>The wallet</Text>
        </NetworkGate>,
      );
      expect(screen.queryByText("Getting things ready...")).toBeNull();
      await act(() => jest.advanceTimersByTimeAsync(WAITING_DELAY_MS));
      expect(screen.getByText("Getting things ready...")).toBeOnTheScreen();
      expect(screen.queryByText("The wallet")).toBeNull();
      await act(() => jest.advanceTimersByTimeAsync(STILL_WORKING_AFTER_MS.check));
      expect(
        screen.getByText("Still checking. This is taking longer than usual."),
      ).toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });

  it("never waits for ever: a read that does not answer ends, within the check's limit, with Try again", async () => {
    jest.useFakeTimers();
    try {
      const check = jest
        .fn<Promise<NetworkCheck>, []>()
        .mockImplementationOnce(() => checkNetwork(() => new Promise(() => undefined), MAINNET))
        .mockResolvedValueOnce("ok");
      await render(
        <NetworkGate check={check} network={network}>
          <Text>The wallet</Text>
        </NetworkGate>,
      );
      await act(() => jest.advanceTimersByTimeAsync(NETWORK_CHECK_LIMIT_MS));
      expect(screen.getByText(CANNOT_REACH)).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
      await act(() => jest.advanceTimersByTimeAsync(0));
      expect(screen.getByText("The wallet")).toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("OfflineBanner", () => {
  const metrics = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, right: 0, bottom: 34, left: 0 },
  };
  const OFFLINE =
    "You're offline. Balances and prices may be out of date, and nothing can be sent until you're back online.";

  it.each([
    [false, true],
    [true, false],
  ])("while online is %s, shows the banner: %s", async (online, shown) => {
    await renderWith(
      await testServices({ useOnline: () => online }),
      <SafeAreaProvider initialMetrics={metrics}>
        <OfflineBanner pinned />
      </SafeAreaProvider>,
    );
    expect(screen.queryByText(OFFLINE) !== null).toBe(shown);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("takes its own place under the status bar instead of lying over the screen", async () => {
    const view = await renderWith(
      await testServices({ useOnline: () => false }),
      <SafeAreaProvider initialMetrics={metrics}>
        <OfflineBanner pinned />
      </SafeAreaProvider>,
    );
    const positions = JSON.stringify(view.toJSON());
    expect(positions).not.toContain('"position":"absolute"');
    expect(positions).toContain('"paddingTop":51');
  });
});
