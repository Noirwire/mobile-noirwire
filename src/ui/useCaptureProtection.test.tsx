import { act, fireEvent, render, renderHook, screen } from "@testing-library/react-native";
import { allowScreenCaptureAsync, preventScreenCaptureAsync } from "expo-screen-capture";
import { AddressReveal } from "@/features/receive/AddressReveal";
import { PhraseGrid } from "./PhraseGrid";
import { CAPTURE_PROTECTION_LIMIT_MS, useCaptureProtection } from "./useCaptureProtection";

jest.mock("./secretClipboard", () => ({ copySecret: jest.fn(() => Promise.resolve()) }));

const prevent = preventScreenCaptureAsync as jest.Mock;
const allow = allowScreenCaptureAsync as jest.Mock;

/** A native call the test answers when it chooses. */
function held() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  prevent.mockImplementationOnce(
    () =>
      new Promise<void>((keep, refuse) => {
        resolve = keep;
        reject = refuse;
      }),
  );
  return {
    resolve: () => act(async () => resolve()),
    reject: () => act(async () => reject(new Error("no"))),
  };
}

beforeEach(() => {
  prevent.mockReset().mockImplementation(() => Promise.resolve());
  allow.mockReset().mockImplementation(() => Promise.resolve());
});
afterEach(() => jest.useRealTimers());

const WORDS = [
  "apple",
  "brick",
  "cloud",
  "delta",
  "eagle",
  "flame",
  "grape",
  "house",
  "ivory",
  "joker",
  "koala",
  "lemon",
];
const ADDRESS = "5aqYNsJsmRuasaFMMWAF2s94r1bTuXZC46A6Ro9C82GY";
const REFUSED = "This can't be shown safely right now, so it is kept hidden. Try again.";
const COPY = {
  label: "Address",
  hidden: "Hidden",
  show: "Show",
  hide: "Hide",
  copy: "Copy",
  copied: "Copied",
  showLabel: "Show address",
  hideLabel: "Hide address",
  copyLabel: "Copy address",
};

describe("useCaptureProtection", () => {
  it("asks for nothing and is not ready while nothing is wanted", async () => {
    const { result } = await renderHook(() => useCaptureProtection(false));
    expect(result.current).toMatchObject({ ready: false, refused: false });
    expect(prevent).not.toHaveBeenCalled();
  });

  it("is ready only once the system has answered, and lets go when no longer wanted", async () => {
    const native = held();
    const { result, rerender } = await renderHook(
      ({ wanted }: { wanted: boolean }) => useCaptureProtection(wanted),
      { initialProps: { wanted: true } },
    );
    expect(prevent).toHaveBeenCalledTimes(1);
    expect(result.current).toMatchObject({ ready: false, refused: false });
    await native.resolve();
    expect(result.current).toMatchObject({ ready: true, refused: false });
    await rerender({ wanted: false });
    expect(result.current.ready).toBe(false);
    expect(allow).toHaveBeenCalledTimes(1);
  });

  it("fails closed when the system rejects, and asks again on retry", async () => {
    const native = held();
    const { result } = await renderHook(() => useCaptureProtection(true));
    await native.reject();
    expect(result.current).toMatchObject({ ready: false, refused: true });
    await act(async () => result.current.retry());
    expect(prevent).toHaveBeenCalledTimes(2);
    expect(result.current).toMatchObject({ ready: true, refused: false });
  });

  it("fails closed when the system never answers, and a late success does not undo that", async () => {
    jest.useFakeTimers();
    const native = held();
    const { result } = await renderHook(() => useCaptureProtection(true));
    await act(() => jest.advanceTimersByTimeAsync(CAPTURE_PROTECTION_LIMIT_MS - 1));
    expect(result.current).toMatchObject({ ready: false, refused: false });
    await act(() => jest.advanceTimersByTimeAsync(1));
    expect(result.current).toMatchObject({ ready: false, refused: true });
    await native.resolve();
    expect(result.current).toMatchObject({ ready: false, refused: true });
  });
});

describe("a recovery phrase", () => {
  it("draws no word between Reveal and the system's answer", async () => {
    const native = held();
    await render(<PhraseGrid words={WORDS} revealed onReveal={jest.fn()} />);
    expect(screen.queryByText("apple")).toBeNull();
    expect(screen.getByLabelText("Recovery phrase, hidden")).toBeOnTheScreen();
    await native.resolve();
    expect(screen.getByText("apple")).toBeOnTheScreen();
    expect(screen.getByLabelText("Word 12, lemon")).toBeOnTheScreen();
  });

  it("stays hidden when the protection is refused, with a way to try again", async () => {
    prevent.mockRejectedValueOnce(new Error("no"));
    await render(<PhraseGrid words={WORDS} revealed onReveal={jest.fn()} />);
    expect(await screen.findByText(REFUSED)).toBeOnTheScreen();
    expect(screen.queryByText("apple")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("apple")).toBeOnTheScreen();
    expect(screen.queryByText(REFUSED)).toBeNull();
  });
});

describe("an address behind Show", () => {
  it("is drawn only after the system has answered, never on the press itself", async () => {
    await render(<AddressReveal address={ADDRESS} copy={COPY} />);
    const native = held();
    await fireEvent.press(screen.getByRole("button", { name: "Show address" }));
    expect(screen.queryByText(/5aqY/)).toBeNull();
    expect(screen.getByText("Hidden")).toBeOnTheScreen();
    await native.resolve();
    expect(screen.getByText(/5aqY/)).toBeOnTheScreen();
  });

  it("stays hidden when the protection is refused", async () => {
    await render(<AddressReveal address={ADDRESS} copy={COPY} />);
    prevent.mockRejectedValueOnce(new Error("no"));
    await fireEvent.press(screen.getByRole("button", { name: "Show address" }));
    expect(await screen.findByText(REFUSED)).toBeOnTheScreen();
    expect(screen.queryByText(/5aqY/)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(/5aqY/)).toBeOnTheScreen();
  });
});
